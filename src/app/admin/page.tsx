'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Event } from '@/lib/types'

type Row = {
  dish_name: string
  quantity: number
  unit_price: number
}

export default function AdminPage() {
  const [events, setEvents] = useState<Event[]>([])
  const [selectedEventId, setSelectedEventId] = useState<string>('')
  const [rows, setRows] = useState<Row[]>([])
  const [orderCount, setOrderCount] = useState(0)

  useEffect(() => {
    supabase
      .from('events')
      .select('id, name, event_date')
      .order('event_date', { ascending: false })
      .then(({ data }) => setEvents(data ?? []))
  }, [])

  useEffect(() => {
    if (!selectedEventId) {
      setRows([])
      return
    }

    async function load() {
      const { data: orders } = await supabase
        .from('orders')
        .select('id')
        .eq('event_id', selectedEventId)
        .neq('status', 'cancelled')

      setOrderCount(orders?.length ?? 0)

      const orderIds = (orders ?? []).map((o) => o.id)
      if (orderIds.length === 0) {
        setRows([])
        return
      }

      const { data: items } = await supabase
        .from('order_items')
        .select('quantity, unit_price, event_dishes(dishes(name))')
        .in('order_id', orderIds)

      const grouped: Record<string, Row> = {}
      for (const item of (items as any) ?? []) {
        const name = item.event_dishes.dishes.name
        if (!grouped[name]) {
          grouped[name] = { dish_name: name, quantity: 0, unit_price: item.unit_price }
        }
        grouped[name].quantity += item.quantity
      }
      setRows(Object.values(grouped).sort((a, b) => b.quantity - a.quantity))
    }

    load()
  }, [selectedEventId])

  const totalRevenue = rows.reduce((sum, r) => sum + r.quantity * r.unit_price, 0)

  return (
    <main className="min-h-screen bg-neutral-50 p-4 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Sales summary</h1>

      <select
        className="w-full border rounded-lg p-3 mb-6 text-lg"
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

      {selectedEventId && (
        <>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-white border rounded-lg p-4">
              <p className="text-sm text-neutral-500">Orders</p>
              <p className="text-2xl font-bold">{orderCount}</p>
            </div>
            <div className="bg-white border rounded-lg p-4">
              <p className="text-sm text-neutral-500">Revenue</p>
              <p className="text-2xl font-bold">R$ {totalRevenue.toFixed(2)}</p>
            </div>
          </div>

          <table className="w-full bg-white border rounded-lg overflow-hidden">
            <thead className="bg-neutral-100 text-left">
              <tr>
                <th className="p-3">Dish</th>
                <th className="p-3">Qty</th>
                <th className="p-3">Subtotal</th>
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
  )
}
