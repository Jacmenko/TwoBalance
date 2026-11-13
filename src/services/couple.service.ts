import { supabase } from '@/lib/supabase/client'
import type { Member, SpaceInfo } from '@/types/domain'
import { unwrap } from './errors'

interface MemberRow {
  id: string
  couple_id: string
  user_id: string
  display_name: string
}

const toMember = (r: MemberRow): Member => ({
  id: r.id,
  coupleId: r.couple_id,
  userId: r.user_id,
  displayName: r.display_name,
})

/** Load the current user's membership and partner (RLS limits rows to own couple). */
export async function fetchSpace(userId: string): Promise<SpaceInfo | null> {
  const rows = await unwrap<MemberRow[]>(
    supabase.from('members').select('id, couple_id, user_id, display_name').order('created_at'),
  )
  const me = rows.find((r) => r.user_id === userId)
  if (!me) return null
  const partner = rows.find((r) => r.user_id !== userId && r.couple_id === me.couple_id)
  return { coupleId: me.couple_id, me: toMember(me), partner: partner ? toMember(partner) : null }
}

export async function createSpace(displayName: string): Promise<{ inviteCode: string }> {
  const rows = await unwrap<{ invite_code: string }[]>(
    supabase.rpc('create_couple', { p_display_name: displayName }),
  )
  return { inviteCode: rows[0].invite_code }
}

export async function joinSpace(code: string, displayName: string): Promise<void> {
  await unwrap(supabase.rpc('join_couple', { p_code: code, p_display_name: displayName }))
}

export async function regenerateInvite(): Promise<string> {
  return unwrap<string>(supabase.rpc('regenerate_invite'))
}
