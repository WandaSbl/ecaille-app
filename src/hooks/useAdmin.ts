import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export function useAdmin() {
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function checkAdmin() {
      const { data: userData } = await supabase.auth.getUser()

      if (!userData?.user) {
        setLoading(false)
        return
      }

      const { data } = await supabase
        .from('MUSICIANS')
        .select('is_admin')
        .eq('user_id', userData.user.id)
        .single()

      setIsAdmin(!!data?.is_admin)
      setLoading(false)
    }

    checkAdmin()
  }, [])

  return { isAdmin, loading }
}
