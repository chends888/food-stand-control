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

  // Load events once
  useEffect(() => {
    supabase
      .from('events')
      .select('id, name, event_date')
      .order('event_date', { ascending: false })
      .then(({ data }) => setEvents(data ?? []))
  }, [])

  // Load dishes for selected event
  useEffect(() => {
    if (!selectedEventId) {
      setEventDishes([])
      return
    }
    supabase
      .from('event_dishes')
      .select('id, event_id, dish_id, price, dishes(id, name)')
      .eq('event_id', selectedEventId)
      .then(({ data }) => setEventDishes((data as any) ?? []))
    setCart({})
  }, [selectedEventId])

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
      alert('Order created but items failed: ' + itemsError.message)
    } else {
      setLastOrderNumber(order.order_number)
      setCart({})
    }
    setSubmitting(false)
  }

  return (
    <main className="min-h-screen bg-neutral-50 p-4 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">New order</h1>

      <select
        className="w-full border rounded-lg p-3 mb-4 text-lg"
        value={selectedEventId}
        onChange={(e) => setSelectedEventId(e.target.value)}
      >
        <option value="">Select event</option>
        {events.map((ev) => (
          <option key={ev.id} value={ev.id}>
            {ev.name}
          </option>
        ))}
      </select>

      {lastOrderNumber !== null && (
        <div className="bg-green-100 border border-green-400 text-green-800 rounded-lg p-3 mb-4">
          Order #{lastOrderNumber} created.
        </div>
      )}

      {selectedEventId && (
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
                  className="w-10 h-10 text-xl bg-neutral-200 rounded-lg"
                  onClick={() => updateQty(ed.id, 1)}
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
