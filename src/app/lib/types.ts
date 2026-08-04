export type Event = {
  id: string
  name: string
  event_date: string
  ended: boolean
  num_days: number
}

export type Dish = {
  id: string
  name: string
}

export type EventDish = {
  id: string
  event_id: string
  dish_id: string
  price: number
  stock: number | null
  dishes: Dish
}

export type OrderStatus = 'pending' | 'ready' | 'delivered' | 'cancelled'

export type Order = {
  id: string
  event_id: string
  order_number: number
  status: OrderStatus
  created_at: string
  day_number: number
}

export type OrderItem = {
  id: string
  order_id: string
  event_dish_id: string
  quantity: number
  unit_price: number
}
