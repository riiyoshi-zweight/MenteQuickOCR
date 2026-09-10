export type Customer = {
  id: string
  name: string
  address: string
  phone: string
  type: string
  completed: boolean
}

export const initialCustomers: Customer[] = [
  {
    id: "A",
    name: "得意先A",
    address: "東京都新宿区西新宿1-1-1",
    phone: "03-1234-5678",
    type: "小型",
    completed: false,
  },
  {
    id: "B",
    name: "得意先B",
    address: "東京都渋谷区渋谷2-2-2",
    phone: "03-2345-6789",
    type: "大口",
    completed: false,
  },
  {
    id: "C",
    name: "得意先C",
    address: "東京都港区六本木3-3-3",
    phone: "03-3456-7890",
    type: "単独",
    completed: false,
  },
  {
    id: "D",
    name: "得意先D",
    address: "東京都千代田区丸の内4-4-4",
    phone: "03-4567-8901",
    type: "小型",
    completed: false,
  },
  {
    id: "E",
    name: "得意先E",
    address: "東京都中央区銀座5-5-5",
    phone: "03-5678-9012",
    type: "大口",
    completed: false,
  },
  {
    id: "F",
    name: "得意先F",
    address: "東京都品川区大崎6-6-6",
    phone: "03-6789-0123",
    type: "単独",
    completed: false,
  },
]
