import { getProfile } from '@/api/profile'
import { useApiResource } from '@/app/hooks/useApiResource'

export function useProfile() {
  const { data, loading, error, reload } = useApiResource(() =>
    getProfile().then((r) => r?.profile ?? null)
  )
  return { profile: data, loading, error, reload }
}
