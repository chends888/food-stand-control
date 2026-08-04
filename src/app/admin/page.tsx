'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Event } from '@/lib/types'
import AdminGate from '@/components/AdminGate'
import Link from 'next/link'
import { useLanguage } from '@/lib/language-context'
import LanguageSwitcher from '@/components/LanguageSwitcher'

type Row = {
  dish_name: string
  quantity: number
  unit_price: number
}

type ItemRecord = {
  order_id: string
  quantity: number
  unit_price: number
  dish_name: string
}

export default function AdminPage() {
  const { t } = useLanguage()
  const [events, setEvents] = useState<Event[]>([])
  const [selectedEventId, setSelectedEventId] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [ending, setEnding] = useState(false)

  // Raw data for the selected event, used to compute per-day and total views
  const [orderDayMap, setOrderDayMap] = useState<Record<string, number>>({})
  const [allItems, setAllItems] = useState<ItemRecord[]>([])
  const [dayFilter, setDayFilter] = useState<'all' | number>('all')

  useEffect(() => {
    supabase
      .from('events')
      .select('id, name, event_date, ended, num_days')
      .order('event_date', { ascending: false })
      .then(({ data }) => {
        setEvents(data ?? [])
        if (data && data.length > 0) {
          handleSelectEvent(data[0].id)
        }
      })
  }, [])

  async function loadSummary(eventId: string) {
    const { data: orders } = await supabase
      .from('orders')
      .select('id, day_number')
      .eq('event_id', eventId)
      .neq('status', 'cancelled')

    const dayMap: Record<string, number> = {}
    for (const o of orders ?? []) {
      dayMap[o.id] = o.day_number
    }
    setOrderDayMap(dayMap)

    const orderIds = (orders ?? []).map((o) => o.id)
    if (orderIds.length === 0) {
      setAllItems([])
      setLoading(false)
      return
    }

    const { data: items } = await supabase
      .from('order_items')
      .select('order_id, quantity, unit_price, event_dishes(dishes(name))')
      .in('order_id', orderIds)

    const records: ItemRecord[] = ((items as any) ?? []).map((item: any) => ({
      order_id: item.order_id,
      quantity: item.quantity,
      unit_price: item.unit_price,
      dish_name: item.event_dishes.dishes.name,
    }))
    setAllItems(records)
    setLoading(false)
  }

  function handleSelectEvent(eventId: string) {
    setSelectedEventId(eventId)
    setDayFilter('all')
    if (!eventId) {
      setAllItems([])
      setOrderDayMap({})
      setLoading(false)
      return
    }
    setLoading(true)
    loadSummary(eventId)
  }

  async function endEvent() {
    if (!selectedEventId) return
    const event = events.find((ev) => ev.id === selectedEventId)
    if (!event) return
    const confirmed = window.confirm(t.admin.endEventConfirm(event.name))
    if (!confirmed) return

    setEnding(true)
    const { error } = await supabase
      .from('events')
      .update({ ended: true })
      .eq('id', selectedEventId)
    setEnding(false)

    if (error) {
      alert(t.admin.endEventError + error.message)
      return
    }

    setEvents((prev) =>
      prev.map((ev) => (ev.id === selectedEventId ? { ...ev, ended: true } : ev))
    )
  }

  const selectedEvent = events.find((ev) => ev.id === selectedEventId)

  // Filter items to the selected day (or all days), then group by dish
  const filteredItems =
    dayFilter === 'all'
      ? allItems
      : allItems.filter((item) => orderDayMap[item.order_id] === dayFilter)

  const rows: Row[] = Object.values(
    filteredItems.reduce((acc: Record<string, Row>, item) => {
      if (!acc[item.dish_name]) {
        acc[item.dish_name] = {
          dish_name: item.dish_name,
          quantity: 0,
          unit_price: item.unit_price,
        }
      }
      acc[item.dish_name].quantity += item.quantity
      return acc
    }, {})
  ).sort((a, b) => b.quantity - a.quantity)

  const orderCount = new Set(
    (dayFilter === 'all'
      ? Object.keys(orderDayMap)
      : Object.keys(orderDayMap).filter((id) => orderDayMap[id] === dayFilter)
    )
  ).size

  const totalRevenue = rows.reduce((sum, r) => sum + r.quantity * r.unit_price, 0)

  return (
    <AdminGate>
      <main className="min-h-screen bg-neutral-50 p-4 max-w-2xl mx-auto">
        <Link href="/" className="text-sm text-neutral-500 mb-2 inline-block">
          ← {t.common.backToHome}
        </Link>
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold">{t.admin.salesSummary}</h1>
          <LanguageSwitcher />
        </div>

        <select
          className="w-full border rounded-lg p-3 mb-6 text-lg"
          value={selectedEventId}
          onChange={(e) => handleSelectEvent(e.target.value)}
        >
          <option value="">{t.admin.selectEvent}</option>
          {events.map((ev) => (
            <option key={ev.id} value={ev.id}>
              {ev.name}
            </option>
          ))}
        </select>

        <Link
          href="/admin/setup"
          className="inline-block bg-neutral-800 text-white px-4 py-2 rounded-lg mb-6"
        >
          {t.admin.goToSetup}
        </Link>

        {selectedEventId && selectedEvent && (
          selectedEvent.ended ? (
            <p className="mb-6 text-sm font-medium text-neutral-500 bg-neutral-100 border rounded-lg px-3 py-2 inline-block">
              {t.admin.eventEnded}
            </p>
          ) : (
            <button
              className="mb-6 bg-red-600 text-white px-4 py-2 rounded-lg font-medium disabled:opacity-50 block"
              onClick={endEvent}
              disabled={ending}
            >
              {ending ? t.admin.ending : t.admin.endEvent}
            </button>
          )
        )}

        {selectedEventId && selectedEvent && selectedEvent.num_days > 1 && (
          <div className="flex flex-wrap gap-2 mb-6">
            <button
              className={`px-4 py-2 rounded-lg font-medium ${
                dayFilter === 'all' ? 'bg-black text-white' : 'bg-white border text-neutral-600'
              }`}
              onClick={() => setDayFilter('all')}
            >
              {t.admin.allDays}
            </button>
            {Array.from({ length: selectedEvent.num_days }, (_, i) => i + 1).map((day) => (
              <button
                key={day}
                className={`px-4 py-2 rounded-lg font-medium ${
                  dayFilter === day ? 'bg-black text-white' : 'bg-white border text-neutral-600'
                }`}
                onClick={() => setDayFilter(day)}
              >
                {t.admin.day} {day}
              </button>
            ))}
          </div>
        )}

        {selectedEventId && loading && (
          <p className="text-neutral-400">{t.admin.loadingSummary}</p>
        )}

        {selectedEventId && !loading && (
          <>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-white border rounded-lg p-4">
                <p className="text-sm text-neutral-500">{t.admin.orders}</p>
                <p className="text-2xl font-bold">{orderCount}</p>
              </div>
              <div className="bg-white border rounded-lg p-4">
                <p className="text-sm text-neutral-500">{t.admin.revenue}</p>
                <p className="text-2xl font-bold">R$ {totalRevenue.toFixed(2)}</p>
              </div>
            </div>

            <table className="w-full bg-white border rounded-lg overflow-hidden">
              <thead className="bg-neutral-100 text-left">
                <tr>
                  <th className="p-3">{t.admin.dish}</th>
                  <th className="p-3">{t.admin.qty}</th>
                  <th className="p-3">{t.admin.subtotal}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.dish_name} className="border-t">
                    <td className="p-3">{r.dish_name}</td>
                    <td className="p-3">{r.quantity}</td>
                    <td className="p-3">R$ {(r.quantity * r.unit_price).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </main>
    </AdminGate>
  )
}
