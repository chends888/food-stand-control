'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type OrderWithItems = {
  id: string
  order_number: number
  status: string
  created_at: string
  order_items: {
    quantity: number
    event_dishes: { dishes: { name: string } }
  }[]
}

export default function KitchenPage() {
  const [orders, setOrders] = useState<OrderWithItems[]>([])
  const [eventName, setEventName] = useState<string>('')
  const [deliveringIds, setDeliveringIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  async function loadOrders() {
    // Only one event is active at a time, so use the most recent one by date.
    const { data: latestEvent } = await supabase
      .from('events')
      .select('id, name')
      .order('event_date', { ascending: false })
      .limit(1)
      .single()

    if (!latestEvent) {
      setOrders([])
      setLoading(false)
      return
    }
    setEventName(latestEvent.name)

    const { data } = await supabase
      .from('orders')
      .select(
        'id, order_number, status, created_at, order_items(quantity, event_dishes(dishes(name)))'
      )
      .eq('event_id', latestEvent.id)
      .eq('status', 'pending')
      .order('order_number', { ascending: true })
    setOrders((data as any) ?? [])
    setLoading(false)
  }

  useEffect(() => {
    loadOrders()

    const channel = supabase
      .channel('kitchen-orders')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => loadOrders()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  async function markDelivered(orderId: string) {
    setDeliveringIds((prev) => new Set(prev).add(orderId))
    const { error } = await supabase
      .from('orders')
      .update({ status: 'delivered' })
      .eq('id', orderId)
    if (error) {
      alert('Failed to update order: ' + error.message)
      setDeliveringIds((prev) => {
        const next = new Set(prev)
        next.delete(orderId)
        return next
      })
    }
    // On success, the realtime subscription will remove this order from the
    // list, so no need to clear deliveringIds here.
  }

  return (
    <main className="min-h-screen bg-neutral-50 p-4">
      <h1 className="text-2xl font-bold mb-1">Kitchen queue</h1>
      {eventName && <p className="text-neutral-500 mb-4">{eventName}</p>}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {orders.map((order) => (
          <div key={order.id} className="rounded-lg p-4 border-2 bg-white border-neutral-300">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xl font-bold">#{order.order_number}</span>
            </div>
            <ul className="mb-3 text-lg">
              {order.order_items.map((item, i) => (
                <li key={i}>
                  {item.quantity}x {item.event_dishes.dishes.name}
                </li>
              ))}
            </ul>
            <button
              className="w-full bg-black text-white py-2 rounded-lg font-medium disabled:opacity-50"
              onClick={() => markDelivered(order.id)}
              disabled={deliveringIds.has(order.id)}
            >
              {deliveringIds.has(order.id) ? 'Marking...' : 'Mark delivered'}
            </button>
          </div>
        ))}
        {loading && <p className="text-neutral-400">Loading orders...</p>}
        {!loading && orders.length === 0 && (
          <p className="text-neutral-400">No pending orders.</p>
        )}
      </div>
    </main>
  )
}
