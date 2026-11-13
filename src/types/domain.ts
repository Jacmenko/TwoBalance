export interface Category {
  id: string
  name: string
  icon: string | null
  sortOrder: number
}

export interface Member {
  id: string
  coupleId: string
  userId: string
  displayName: string
}

export interface Expense {
  id: string
  coupleId: string
  payerMemberId: string
  categoryId: string
  amountCents: number
  description: string
  expenseDate: string // YYYY-MM-DD
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

export interface ExpenseInput {
  categoryId: string
  amountCents: number
  description: string
  expenseDate: string
}

export interface ExpenseFilters {
  from?: string
  to?: string
  payerMemberId?: string
  categoryId?: string
}

export interface SpaceInfo {
  coupleId: string
  name: string
  /** Just for one person: no partner, no 50/50 split, no invite. */
  solo: boolean
  me: Member
  /** null until the second person has joined */
  partner: Member | null
}
