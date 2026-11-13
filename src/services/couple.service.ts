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

/** All spaces the current user belongs to, oldest first (RLS limits rows to own spaces). */
export async function fetchSpaces(userId: string): Promise<SpaceInfo[]> {
  const [members, couples] = await Promise.all([
    unwrap<MemberRow[]>(
      supabase.from('members').select('id, couple_id, user_id, display_name').order('created_at'),
    ),
    unwrap<{ id: string; name: string }[]>(supabase.from('couples').select('id, name')),
  ])
  const names = new Map(couples.map((c) => [c.id, c.name]))
  return members
    .filter((r) => r.user_id === userId)
    .map((me) => {
      const partner = members.find((r) => r.couple_id === me.couple_id && r.user_id !== userId)
      return {
        coupleId: me.couple_id,
        name: names.get(me.couple_id) ?? 'Our space',
        me: toMember(me),
        partner: partner ? toMember(partner) : null,
      }
    })
}

export async function createSpace(
  displayName: string,
  spaceName: string,
): Promise<{ coupleId: string; inviteCode: string }> {
  const rows = await unwrap<{ couple_id: string; invite_code: string }[]>(
    supabase.rpc('create_couple', { p_display_name: displayName, p_space_name: spaceName }),
  )
  return { coupleId: rows[0].couple_id, inviteCode: rows[0].invite_code }
}

export async function joinSpace(code: string, displayName: string): Promise<{ coupleId: string }> {
  const rows = await unwrap<{ couple_id: string }[]>(
    supabase.rpc('join_couple', { p_code: code, p_display_name: displayName }),
  )
  return { coupleId: rows[0].couple_id }
}

export async function regenerateInvite(coupleId: string): Promise<string> {
  return unwrap<string>(supabase.rpc('regenerate_invite', { p_couple_id: coupleId }))
}

export async function renameSpace(coupleId: string, name: string): Promise<void> {
  await unwrap(supabase.rpc('rename_couple', { p_couple_id: coupleId, p_name: name }))
}
