'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Event, EventDish } from '@/lib/types'

export default function OrderPage() {
  const [events, setEvents] = useState<Event[]>([])
  const [selectedEventId, setSelectedEventId] = useState<string>('')
  const [eventDishes, setEventDishes] = useState<EventDish[]>([])
  const [cart, setCart] = useState<Record<string, number>>({}) // event_dish_id -> qty
  const [submitting, setSubmitting] = useState(false)
  const [lastOrderNumber, setLastOrderNumber] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [eventsLoaded, setEventsLoaded] = useState(false)

  async function loadDishes(eventId: string) {
    const { data } = await supabase
      .from('event_dishes')
      .select('id, event_id, dish_id, price, stock, dishes(id, name)')
      .eq('event_id', eventId)
    setEventDishes((data as any) ?? [])
    setLoading(false)
  }

  function handleSelectEvent(eventId: string) {
    setSelectedEventId(eventId)
    setCart({})
    if (!eventId) {
      setEventDishes([])
      setLoading(false)
      return
    }
    setLoading(true)
    loadDishes(eventId)
  }

  // Keep stock numbers live: refresh whenever event_dishes changes for the
  // selected event (e.g. admin updates stock, or another device sells out).
  useEffect(() => {
    if (!selectedEventId) return

    const channel = supabase
      .channel(`order-event-dishes-${selectedEventId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'event_dishes',
          filter: `event_id=eq.${selectedEventId}`,
        },
        () => loadDishes(selectedEventId)
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [selectedEventId])

  // Load events once
  useEffect(() => {
    supabase
      .from('events')
      .select('id, name, event_date, ended')
      .eq('ended', false)
      .order('event_date', { ascending: false })
      .then(({ data }) => {
        setEvents(data ?? [])
        setEventsLoaded(true)
        if (data && data.length > 0) {
          handleSelectEvent(data[0].id)
        }
      })
  }, [])

  function updateQty(eventDishId: string, delta: number) {
    setCart((prev) => {
      const next = { ...prev }
      const current = next[eventDishId] ?? 0
      const updated = Math.max(0, current + delta)
      if (updated === 0) {
        delete next[eventDishId]
      } else {
        next[eventDishId] = updated
      }
      return next
    })
  }

  const total = Object.entries(cart).reduce((sum, [eventDishId, qty]) => {
    const ed = eventDishes.find((d) => d.id === eventDishId)
    return sum + (ed ? ed.price * qty : 0)
  }, 0)

  async function submitOrder() {
    if (!selectedEventId || Object.keys(cart).length === 0) return
    setSubmitting(true)

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({ event_id: selectedEventId })
      .select()
      .single()

    if (orderError || !order) {
      alert('Failed to create order: ' + orderError?.message)
      setSubmitting(false)
      return
    }

    const items = Object.entries(cart).map(([eventDishId, qty]) => {
      const ed = eventDishes.find((d) => d.id === eventDishId)!
      return {
        order_id: order.id,
        event_dish_id: eventDishId,
        quantity: qty,
        unit_price: ed.price,
      }
    })

    const { error: itemsError } = await supabase.from('order_items').insert(items)

    if (itemsError) {
      if (itemsError.message.includes('Not enough stock')) {
        alert(itemsError.message + '. Refreshing menu with current stock.')
      } else {
        alert('Order created but items failed: ' + itemsError.message)
      }
      // Order was created but items failed (e.g. insufficient stock) — the
      // order stays as an empty pending order, and the stock numbers shown
      // may now be stale, so refresh them.
      loadDishes(selectedEventId)
    } else {
      setLastOrderNumber(order.order_number)
      setCart({})
    }
    setSubmitting(false)
  }

  return (
    <main className="min-h-screen bg-neutral-50 p-4 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">New order</h1>

      {!eventsLoaded && (
        <p className="text-neutral-400 text-lg">Loading events...</p>
      )}

      {eventsLoaded && events.length === 0 && (
        <p className="text-neutral-400 text-lg">No active events.</p>
      )}

      {eventsLoaded && events.length > 0 && (
        <select
          className="w-full border rounded-lg p-3 mb-4 text-lg"
          value={selectedEventId}
          onChange={(e) => handleSelectEvent(e.target.value)}
        >
          <option value="">Select event</option>
          {events.map((ev) => (
            <option key={ev.id} value={ev.id}>
              {ev.name}
            </option>
          ))}
        </select>
      )}

      {lastOrderNumber !== null && (
        <div className="bg-green-100 border border-green-400 text-green-800 rounded-lg px-4 py-3 mb-4 text-lg font-semibold">
          Last order: #{lastOrderNumber}
        </div>
      )}

      {selectedEventId && loading && (
        <p className="text-neutral-400">Loading menu...</p>
      )}

      {selectedEventId && !loading && (
        <div className="space-y-3">
          {eventDishes.map((ed) => (
            <div
              key={ed.id}
              className="flex items-center justify-between bg-white border rounded-lg p-3"
            >
              <div>
                <p className="font-medium">{(ed as any).dishes?.name}</p>
                <p className="text-sm text-neutral-500">
                  R$ {ed.price.toFixed(2)}
                </p>
                <p className="text-xs text-neutral-400">
                  {ed.stock === null ? 'Unlimited stock' : `${ed.stock} left`}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  className="w-10 h-10 text-xl bg-neutral-200 rounded-lg"
                  onClick={() => updateQty(ed.id, -1)}
                >
                  −
                </button>
                <span className="w-6 text-center text-lg">{cart[ed.id] ?? 0}</span>
                <button
                  className="w-10 h-10 text-xl bg-neutral-200 rounded-lg disabled:opacity-40"
                  onClick={() => updateQty(ed.id, 1)}
                  disabled={ed.stock !== null && (cart[ed.id] ?? 0) >= ed.stock}
                >
                  +
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {Object.keys(cart).length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 max-w-xl mx-auto">
          <div className="flex justify-between mb-3 text-lg font-semibold">
            <span>Total</span>
            <span>R$ {total.toFixed(2)}</span>
          </div>
          <button
            className="w-full bg-black text-white text-lg font-medium py-3 rounded-lg disabled:opacity-50"
            onClick={submitOrder}
            disabled={submitting}
          >
            {submitting ? 'Submitting...' : 'Submit order'}
          </button>
        </div>
      )}
    </main>
  )
}
