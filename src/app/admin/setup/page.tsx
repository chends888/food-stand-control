'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Event, Dish, EventDish } from '@/lib/types'
import Link from 'next/link'
import AdminGate from '@/components/AdminGate'

export default function AdminSetupPage() {
  const [events, setEvents] = useState<Event[]>([])
  const [dishes, setDishes] = useState<Dish[]>([])

  const [newEventName, setNewEventName] = useState('')
  const [newEventDate, setNewEventDate] = useState('')
  const [newDishName, setNewDishName] = useState('')

  const [selectedEventId, setSelectedEventId] = useState('')
  const [selectedDishId, setSelectedDishId] = useState('')
  const [price, setPrice] = useState('')
  const [stock, setStock] = useState('')
  const [eventDishes, setEventDishes] = useState<EventDish[]>([])
  const [savingStockIds, setSavingStockIds] = useState<Set<string>>(new Set())
  const stockTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  async function loadEvents() {
    const { data } = await supabase
      .from('events')
      .select('id, name, event_date, ended')
      .order('event_date', { ascending: false })
    setEvents(data ?? [])
  }

  async function loadDishes() {
    const { data } = await supabase.from('dishes').select('id, name').order('name')
    setDishes(data ?? [])
  }

  async function loadEventDishes(eventId: string) {
    const { data } = await supabase
      .from('event_dishes')
      .select('id, event_id, dish_id, price, stock, dishes(id, name)')
      .eq('event_id', eventId)
    setEventDishes((data as any) ?? [])
  }

  useEffect(() => {
    loadEvents()
    loadDishes()
  }, [])

  useEffect(() => {
    if (selectedEventId) loadEventDishes(selectedEventId)
    else setEventDishes([])
  }, [selectedEventId])

  const selectedEvent = events.find((ev) => ev.id === selectedEventId)

  async function createEvent() {
    if (!newEventName || !newEventDate) return
    const { error } = await supabase
      .from('events')
      .insert({ name: newEventName, event_date: newEventDate })
    if (error) return alert(error.message)
    setNewEventName('')
    setNewEventDate('')
    loadEvents()
  }

  async function createDish() {
    if (!newDishName) return
    const { error } = await supabase.from('dishes').insert({ name: newDishName })
    if (error) return alert(error.message)
    setNewDishName('')
    loadDishes()
  }

  async function linkDish() {
    if (!selectedEventId || !selectedDishId || !price) return
    if (selectedEvent?.ended) return
    const { error } = await supabase.from('event_dishes').insert({
      event_id: selectedEventId,
      dish_id: selectedDishId,
      price: parseFloat(price),
      stock: stock === '' ? null : parseInt(stock, 10),
    })
    if (error) return alert(error.message)
    setSelectedDishId('')
    setPrice('')
    setStock('')
    loadEventDishes(selectedEventId)
  }

  async function updateStock(id: string, newStock: string) {
    if (selectedEvent?.ended) return
    const value = newStock === '' ? null : parseInt(newStock, 10)
    const { error } = await supabase
      .from('event_dishes')
      .update({ stock: value })
      .eq('id', id)
    if (error) alert(error.message)
    await loadEventDishes(selectedEventId)
    setSavingStockIds((prev) => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
  }

  function handleStockChange(id: string, newValue: string) {
    setSavingStockIds((prev) => new Set(prev).add(id))
    if (stockTimers.current[id]) clearTimeout(stockTimers.current[id])
    stockTimers.current[id] = setTimeout(() => {
      updateStock(id, newValue)
    }, 600)
  }

  async function removeEventDish(id: string) {
    if (selectedEvent?.ended) return
    const { error } = await supabase.from('event_dishes').delete().eq('id', id)
    if (error) {
      // Postgres blocks this delete (on delete restrict) if orders already
      // reference this event_dish — i.e. it has sales tied to it.
      alert(
        'Cannot remove this dish: it already has orders placed for it. ' +
          'Removing it would break historical sales data.'
      )
      return
    }
    loadEventDishes(selectedEventId)
  }

  return (
    <AdminGate>
      <main className="min-h-screen bg-neutral-50 p-4 max-w-2xl mx-auto space-y-8">
        <h1 className="text-2xl font-bold">Setup</h1>
        <Link
          href="/admin"
          className="inline-block bg-neutral-800 text-white px-4 py-2 rounded-lg"
        >
          Back to summary
        </Link>

        {/* Create event */}
        <section className="bg-white border rounded-lg p-4 space-y-3">
          <h2 className="font-semibold text-lg">New event</h2>
          <input
            className="w-full border rounded-lg p-2"
            placeholder="Event name"
            value={newEventName}
            onChange={(e) => setNewEventName(e.target.value)}
          />
          <input
            type="datetime-local"
            className="w-full border rounded-lg p-2"
            value={newEventDate}
            onChange={(e) => setNewEventDate(e.target.value)}
          />
          <button
            className="bg-black text-white px-4 py-2 rounded-lg"
            onClick={createEvent}
          >
            Create event
          </button>
        </section>

        {/* Create dish */}
        <section className="bg-white border rounded-lg p-4 space-y-3">
          <h2 className="font-semibold text-lg">New dish</h2>
          <input
            className="w-full border rounded-lg p-2"
            placeholder="Dish name"
            value={newDishName}
            onChange={(e) => setNewDishName(e.target.value)}
          />
          <button
            className="bg-black text-white px-4 py-2 rounded-lg"
            onClick={createDish}
          >
            Create dish
          </button>
        </section>

        {/* Link dish to event with price */}
        <section className="bg-white border rounded-lg p-4 space-y-3">
          <h2 className="font-semibold text-lg">Add dish to event</h2>
          <select
            className="w-full border rounded-lg p-2"
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

          {selectedEventId && selectedEvent?.ended && (
            <p className="text-sm font-medium text-neutral-500 bg-neutral-100 border rounded-lg px-3 py-2">
              This event has ended. Dishes can no longer be added or removed.
            </p>
          )}

          {selectedEventId && !selectedEvent?.ended && (
            <>
              <select
                className="w-full border rounded-lg p-2"
                value={selectedDishId}
                onChange={(e) => setSelectedDishId(e.target.value)}
              >
                <option value="">Select dish</option>
                {dishes.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
              <input
                type="number"
                step="0.01"
                className="w-full border rounded-lg p-2"
                placeholder="Price"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
              <input
                type="number"
                min="0"
                className="w-full border rounded-lg p-2"
                placeholder="Stock (leave empty for unlimited)"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
              />
              <button
                className="bg-black text-white px-4 py-2 rounded-lg"
                onClick={linkDish}
              >
                Add to event
              </button>
            </>
          )}

          {selectedEventId && (
            <ul className="pt-2 space-y-2">
              {eventDishes.map((ed) => (
                <li
                  key={ed.id}
                  className="flex justify-between items-center border-t pt-2 gap-2"
                >
                  <span className="flex-1">
                    {(ed as any).dishes?.name} — R$ {ed.price.toFixed(2)}
                  </span>
                  <span className="text-xs text-neutral-500">Stock:</span>
                  <input
                    type="number"
                    min="0"
                    className="w-24 border rounded-lg p-1 text-sm"
                    placeholder="Unlimited"
                    defaultValue={ed.stock ?? ''}
                    disabled={selectedEvent?.ended}
                    onChange={(e) => handleStockChange(ed.id, e.target.value)}
                  />
                  {savingStockIds.has(ed.id) && (
                    <span className="text-xs text-neutral-400">Saving...</span>
                  )}
                  {!selectedEvent?.ended && (
                    <button
                      className="text-red-600 text-sm"
                      onClick={() => removeEventDish(ed.id)}
                    >
                      Remove
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </AdminGate>
  )
}
