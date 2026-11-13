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
    unwrap<{ id: string; name: string; solo: boolean }[]>(
      supabase.from('couples').select('id, name, solo'),
    ),
  ])
  const byId = new Map(couples.map((c) => [c.id, c]))
  return members
    .filter((r) => r.user_id === userId)
    .map((me) => {
      const partner = members.find((r) => r.couple_id === me.couple_id && r.user_id !== userId)
      return {
        coupleId: me.couple_id,
        name: byId.get(me.couple_id)?.name ?? 'Our space',
        solo: byId.get(me.couple_id)?.solo ?? false,
        me: toMember(me),
        partner: partner ? toMember(partner) : null,
      }
    })
}

export async function createSpace(
  displayName: string,
  spaceName: string,
  solo: boolean,
): Promise<{ coupleId: string; inviteCode: string | null }> {
  const rows = await unwrap<{ couple_id: string; invite_code: string | null }[]>(
    supabase.rpc('create_couple', {
      p_display_name: displayName,
      p_space_name: spaceName,
      p_solo: solo,
    }),
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

/** Delete a space (and all its expenses) for everyone in it. */
export async function deleteSpace(coupleId: string): Promise<void> {
  await unwrap(supabase.rpc('delete_couple', { p_couple_id: coupleId }))
}

/** Change a space to single-person. For a shared space this gives each person their own
 *  copy (with all expenses) and removes the shared one. Returns the caller's resulting space. */
export async function makeSpaceSolo(coupleId: string): Promise<string> {
  return unwrap<string>(supabase.rpc('split_couple', { p_couple_id: coupleId }))
}
