import * as React from 'react'

import { trackBackendRequest } from '~/lib/backend-activity'

export function useMutation<TVariables, TData, TError = Error>(opts: {
  fn: (variables: TVariables) => Promise<TData>
  onSuccess?: (ctx: { data: TData }) => void | Promise<void>
}) {
  const { fn } = opts
  // `mutate` keeps its identity for as long as `fn` does, but `onSuccess` is
  // usually an inline closure over the caller's current props and state. Read
  // through a ref, a mutation always finishes with the latest one instead of
  // the closure from the render that happened to create `mutate`.
  const onSuccess = React.useRef(opts.onSuccess)
  React.useEffect(() => {
    onSuccess.current = opts.onSuccess
  })

  const [submittedAt, setSubmittedAt] = React.useState<number | undefined>()
  const [variables, setVariables] = React.useState<TVariables | undefined>()
  const [error, setError] = React.useState<TError | undefined>()
  const [data, setData] = React.useState<TData | undefined>()
  const [status, setStatus] = React.useState<
    'idle' | 'pending' | 'success' | 'error'
  >('idle')

  const mutate = React.useCallback(
    async (variables: TVariables): Promise<TData | undefined> => {
      setStatus('pending')
      setSubmittedAt(Date.now())
      setVariables(variables)
      //
      try {
        const data = await trackBackendRequest(fn(variables))
        await onSuccess.current?.({ data })
        setStatus('success')
        setError(undefined)
        setData(data)
        return data
      } catch (err) {
        setStatus('error')
        setError(err as TError)
      }
    },
    [fn],
  )

  return {
    status,
    variables,
    submittedAt,
    mutate,
    error,
    data,
  }
}
