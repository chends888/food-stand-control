export type Event = {
  id: string
  name: string
  event_date: string
  ended: boolean
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
  dishes: Dish
}

export type OrderStatus = 'pending' | 'ready' | 'delivered' | 'cancelled'

export type Order = {
  id: string
  event_id: string
  order_number: number
  status: OrderStatus
  created_at: string
}

export type OrderItem = {
  id: string
  order_id: string
  event_dish_id: string
  quantity: number
  unit_price: number
}
