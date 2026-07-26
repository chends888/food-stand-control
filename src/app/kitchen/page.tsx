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

  async function loadOrders() {
    const { data } = await supabase
      .from('orders')
      .select(
        'id, order_number, status, created_at, order_items(quantity, event_dishes(dishes(name)))'
      )
      .in('status', ['pending', 'ready'])
      .order('order_number', { ascending: true })
    setOrders((data as any) ?? [])
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

  async function markReady(orderId: string) {
    await supabase.from('orders').update({ status: 'ready' }).eq('id', orderId)
  }

  async function markDelivered(orderId: string) {
    await supabase.from('orders').update({ status: 'delivered' }).eq('id', orderId)
  }

  return (
    <main className="min-h-screen bg-neutral-50 p-4">
      <h1 className="text-2xl font-bold mb-4">Kitchen queue</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {orders.map((order) => (
          <div
            key={order.id}
            className={`rounded-lg p-4 border-2 ${
              order.status === 'ready'
                ? 'bg-green-50 border-green-400'
                : 'bg-white border-neutral-300'
            }`}
          >
            <div className="flex justify-between items-center mb-2">
              <span className="text-xl font-bold">#{order.order_number}</span>
              <span className="text-sm uppercase text-neutral-500">{order.status}</span>
            </div>
            <ul className="mb-3 text-lg">
              {order.order_items.map((item, i) => (
                <li key={i}>
                  {item.quantity}x {item.event_dishes.dishes.name}
                </li>
              ))}
            </ul>
            {order.status === 'pending' && (
              <button
                className="w-full bg-black text-white py-2 rounded-lg font-medium"
                onClick={() => markReady(order.id)}
              >
                Mark ready
              </button>
            )}
            {order.status === 'ready' && (
              <button
                className="w-full bg-green-600 text-white py-2 rounded-lg font-medium"
                onClick={() => markDelivered(order.id)}
              >
                Mark delivered
              </button>
            )}
          </div>
        ))}
        {orders.length === 0 && (
          <p className="text-neutral-400">No pending orders.</p>
        )}
      </div>
    </main>
  )
}
