'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Event, Dish, EventDish } from '@/lib/types'
import Link from 'next/link'
import AdminGate from '@/components/AdminGate'
import { useLanguage } from '@/lib/language-context'
import LanguageSwitcher from '@/components/LanguageSwitcher'

export default function AdminSetupPage() {
  const { t } = useLanguage()
  const [events, setEvents] = useState<Event[]>([])
  const [dishes, setDishes] = useState<Dish[]>([])

  const [newEventName, setNewEventName] = useState('')
  const [newEventDate, setNewEventDate] = useState('')
  const [newNumDays, setNewNumDays] = useState('1')
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
      .select('id, name, event_date, ended, num_days')
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
      .insert({ name: newEventName, event_date: newEventDate, num_days: parseInt(newNumDays, 10) })
    if (error) return alert(error.message)
    setNewEventName('')
    setNewEventDate('')
    setNewNumDays('1')
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
      alert(t.setup.cannotRemoveDish)
      return
    }
    loadEventDishes(selectedEventId)
  }

  return (
    <AdminGate>
      <main className="min-h-screen bg-neutral-50 p-4 max-w-2xl mx-auto space-y-8">
        <Link href="/" className="text-sm text-neutral-500 inline-block">
          ← {t.common.backToHome}
        </Link>
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">{t.setup.title}</h1>
          <LanguageSwitcher />
        </div>
        <Link
          href="/admin"
          className="inline-block bg-neutral-800 text-white px-4 py-2 rounded-lg"
        >
          {t.setup.backToSummary}
        </Link>

        {/* Create event */}
        <section className="bg-white border rounded-lg p-4 space-y-3">
          <h2 className="font-semibold text-lg">{t.setup.newEvent}</h2>
          <input
            className="w-full border rounded-lg p-2"
            placeholder={t.setup.eventName}
            value={newEventName}
            onChange={(e) => setNewEventName(e.target.value)}
          />
          <input
            type="date"
            className="w-full border rounded-lg p-2"
            value={newEventDate}
            onChange={(e) => setNewEventDate(e.target.value)}
          />
          <div>
            <label className="text-sm text-neutral-500 block mb-1">{t.setup.numDays}</label>
            <select
              className="w-full border rounded-lg p-2"
              value={newNumDays}
              onChange={(e) => setNewNumDays(e.target.value)}
            >
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
          <button
            className="bg-black text-white px-4 py-2 rounded-lg"
            onClick={createEvent}
          >
            {t.setup.createEvent}
          </button>
        </section>

        {/* Create dish */}
        <section className="bg-white border rounded-lg p-4 space-y-3">
          <h2 className="font-semibold text-lg">{t.setup.newDish}</h2>
          <input
            className="w-full border rounded-lg p-2"
            placeholder={t.setup.dishName}
            value={newDishName}
            onChange={(e) => setNewDishName(e.target.value)}
          />
          <button
            className="bg-black text-white px-4 py-2 rounded-lg"
            onClick={createDish}
          >
            {t.setup.createDish}
          </button>
        </section>

        {/* Link dish to event with price */}
        <section className="bg-white border rounded-lg p-4 space-y-3">
          <h2 className="font-semibold text-lg">{t.setup.addDishToEvent}</h2>
          <select
            className="w-full border rounded-lg p-2"
            value={selectedEventId}
            onChange={(e) => setSelectedEventId(e.target.value)}
          >
            <option value="">{t.admin.selectEvent}</option>
            {events.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.name}
              </option>
            ))}
          </select>

          {selectedEventId && selectedEvent?.ended && (
            <p className="text-sm font-medium text-neutral-500 bg-neutral-100 border rounded-lg px-3 py-2">
              {t.setup.eventEndedNotice}
            </p>
          )}

          {selectedEventId && !selectedEvent?.ended && (
            <>
              <select
                className="w-full border rounded-lg p-2"
                value={selectedDishId}
                onChange={(e) => setSelectedDishId(e.target.value)}
              >
                <option value="">{t.setup.selectDish}</option>
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
                placeholder={t.setup.price}
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
              <input
                type="number"
                min="0"
                className="w-full border rounded-lg p-2"
                placeholder={t.setup.stockPlaceholder}
                value={stock}
                onChange={(e) => setStock(e.target.value)}
              />
              <button
                className="bg-black text-white px-4 py-2 rounded-lg"
                onClick={linkDish}
              >
                {t.setup.addToEvent}
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
                  <span className="text-xs text-neutral-500">{t.setup.stock}:</span>
                  <input
                    type="number"
                    min="0"
                    className="w-24 border rounded-lg p-1 text-sm"
                    placeholder={t.common.unlimited}
                    defaultValue={ed.stock ?? ''}
                    disabled={selectedEvent?.ended}
                    onChange={(e) => handleStockChange(ed.id, e.target.value)}
                  />
                  {savingStockIds.has(ed.id) && (
                    <span className="text-xs text-neutral-400">{t.setup.saving}</span>
                  )}
                  {!selectedEvent?.ended && (
                    <button
                      className="text-red-600 text-sm"
                      onClick={() => removeEventDish(ed.id)}
                    >
                      {t.setup.remove}
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
