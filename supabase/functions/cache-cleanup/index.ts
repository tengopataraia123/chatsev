import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Handler registry: maps cleanup_items.key to actual cleanup logic
const HANDLER_REGISTRY: Record<string, (supabase: any, checkpoint: any, batchSize: number, cutoffDate: string | null) => Promise<{ deleted: number; hasMore: boolean; checkpoint: any }>> = {
  'db:private_messages': cleanPrivateMessages,
  'db:group_messages': cleanGroupMessages,
  'db:unread_receipts': cleanUnreadReceipts,
  'db:profile_views': cleanProfileViews,
  'db:notifications': cleanNotifications,
}

// ─── HANDLERS ────────────────────────────────────────

async function cleanPrivateMessages(supabase: any, checkpoint: any, batchSize: number, cutoffDate: string | null) {
  return await batchDeleteByDate(supabase, 'messenger_messages', 'created_at', 'id', checkpoint, batchSize, cutoffDate)
}

async function cleanGroupMessages(supabase: any, checkpoint: any, batchSize: number, cutoffDate: string | null) {
  return await batchDeleteByDate(supabase, 'messenger_group_messages', 'created_at', 'id', checkpoint, batchSize, cutoffDate)
}

async function cleanUnreadReceipts(supabase: any, checkpoint: any, batchSize: number, cutoffDate: string | null) {
  return await batchDeleteByDate(supabase, 'messenger_group_reads', 'last_read_at', 'id', checkpoint, batchSize, cutoffDate)
}

async function cleanProfileViews(supabase: any, checkpoint: any, batchSize: number, cutoffDate: string | null) {
  return await batchDeleteByDate(supabase, 'profile_visits', 'visited_at', 'id', checkpoint, batchSize, cutoffDate)
}

async function cleanNotifications(supabase: any, checkpoint: any, batchSize: number, cutoffDate: string | null) {
  return await batchDeleteByDate(supabase, 'notifications', 'created_at', 'id', checkpoint, batchSize, cutoffDate)
}

// ─── GENERIC BATCH DELETE ────────────────────────────

async function batchDeleteByDate(
  supabase: any,
  tableName: string,
  dateColumn: string,
  idColumn: string,
  checkpoint: any,
  batchSize: number,
  cutoffDate: string | null
): Promise<{ deleted: number; hasMore: boolean; checkpoint: any }> {
  const lastId = checkpoint?.last_id || null

  let query = supabase
    .from(tableName)
    .select(idColumn)
    .order(dateColumn, { ascending: true })
    .order(idColumn, { ascending: true })
    .limit(batchSize)

  if (cutoffDate) {
    query = query.lt(dateColumn, cutoffDate)
  }
  if (lastId) {
    query = query.gt(idColumn, lastId)
  }

  const { data: rows, error: selectErr } = await query

  if (selectErr) {
    console.error(`Select error for ${tableName}:`, selectErr)
    throw new Error(`${tableName}: ${selectErr.message}`)
  }

  if (!rows || rows.length === 0) {
    return { deleted: 0, hasMore: false, checkpoint: { last_id: null } }
  }

  const ids = rows.map((r: any) => r[idColumn])
  const { error: delErr, count } = await supabase
    .from(tableName)
    .delete({ count: 'exact' })
    .in(idColumn, ids)

  if (delErr) {
    console.error(`Delete error for ${tableName}:`, delErr)
    throw new Error(`${tableName}: ${delErr.message}`)
  }

  const deleted = count || ids.length
  // If we got a full batch, there may be more
  // Note: we don't update last_id for checkpoint since we deleted these rows,
  // so next query with same checkpoint will get new rows
  return {
    deleted,
    hasMore: rows.length >= batchSize,
    checkpoint: { last_id: null } // rows are deleted, no need to track last_id
  }
}

// ─── MAIN SERVER ─────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { action, runId, itemId, cutoffDate, batchSize } = await req.json()

    console.log('Action:', action, 'RunId:', runId, 'ItemId:', itemId)

    // ─── LIST: Get all cleanup items with latest run status ───
    if (action === 'list') {
      const { data: items, error: itemsErr } = await supabase
        .from('cleanup_items')
        .select('*')
        .eq('enabled', true)
        .order('type')
        .order('title_ka')

      if (itemsErr) throw new Error(itemsErr.message)

      // Get latest run for each item
      const itemIds = items.map((i: any) => i.id)
      const { data: runs } = await supabase
        .from('cleanup_runs')
        .select('*')
        .in('cleanup_item_id', itemIds)
        .order('started_at', { ascending: false })

      // Map latest run per item
      const latestRuns: Record<string, any> = {}
      for (const run of (runs || [])) {
        if (!latestRuns[run.cleanup_item_id]) {
          latestRuns[run.cleanup_item_id] = run
        }
      }

      return json({ success: true, items, latestRuns })
    }

    // ─── START: Begin a cleanup run for a specific item ───
    if (action === 'start') {
      if (!itemId) return json({ error: 'itemId required' }, 400)

      // Check if already running
      const { data: existingRuns } = await supabase
        .from('cleanup_runs')
        .select('id, status')
        .eq('cleanup_item_id', itemId)
        .in('status', ['running', 'paused'])
        .limit(1)

      if (existingRuns && existingRuns.length > 0) {
        return json({ error: 'Already has an active run', runId: existingRuns[0].id })
      }

      // Create new run
      const { data: newRun, error: createErr } = await supabase
        .from('cleanup_runs')
        .insert({
          cleanup_item_id: itemId,
          status: 'running',
          started_at: new Date().toISOString(),
          checkpoint_json: {},
          processed_count: 0,
          processed_batches: 0
        })
        .select('id')
        .single()

      if (createErr) throw new Error(createErr.message)

      return json({ success: true, runId: newRun.id })
    }

    // ─── TICK: Process one batch for a running cleanup ───
    if (action === 'tick') {
      if (!runId) return json({ error: 'runId required' }, 400)

      // Get the run + item info
      const { data: run, error: runErr } = await supabase
        .from('cleanup_runs')
        .select('*, cleanup_items(*)')
        .eq('id', runId)
        .single()

      if (runErr || !run) return json({ error: 'Run not found' }, 404)
      if (run.status !== 'running') return json({ success: true, status: run.status, done: true })

      const item = run.cleanup_items
      const handler = HANDLER_REGISTRY[item.key]

      if (!handler) {
        // No handler for this key — mark as error
        await supabase.from('cleanup_runs').update({
          status: 'error',
          last_error: `No handler for key: ${item.key}`,
          finished_at: new Date().toISOString()
        }).eq('id', runId)
        return json({ success: false, error: `No handler for: ${item.key}` })
      }

      const effectiveBatchSize = batchSize || item.default_batch_size || 20
      const effectiveCutoff = cutoffDate || null

      try {
        const result = await handler(supabase, run.checkpoint_json, effectiveBatchSize, effectiveCutoff)

        const newProcessedCount = (run.processed_count || 0) + result.deleted
        const newProcessedBatches = (run.processed_batches || 0) + 1

        if (result.hasMore) {
          // More to process
          await supabase.from('cleanup_runs').update({
            checkpoint_json: result.checkpoint,
            processed_count: newProcessedCount,
            processed_batches: newProcessedBatches,
            last_error: null,
            retry_after: null
          }).eq('id', runId)

          return json({
            success: true,
            deleted: result.deleted,
            hasMore: true,
            processedCount: newProcessedCount,
            processedBatches: newProcessedBatches
          })
        } else {
          // Done
          await supabase.from('cleanup_runs').update({
            status: 'done',
            checkpoint_json: result.checkpoint,
            processed_count: newProcessedCount,
            processed_batches: newProcessedBatches,
            finished_at: new Date().toISOString(),
            last_error: null
          }).eq('id', runId)

          return json({
            success: true,
            deleted: result.deleted,
            hasMore: false,
            done: true,
            processedCount: newProcessedCount,
            processedBatches: newProcessedBatches
          })
        }
      } catch (err) {
        console.error(`Tick error for ${item.key}:`, err)
        // Exponential backoff
        const retryMs = Math.min(120000, (run.processed_batches || 0) * 10000 + 10000)
        const retryAfter = new Date(Date.now() + retryMs).toISOString()

        await supabase.from('cleanup_runs').update({
          last_error: err instanceof Error ? err.message : String(err),
          retry_after: retryAfter
        }).eq('id', runId)

        return json({
          success: false,
          error: err instanceof Error ? err.message : String(err),
          retryAfter,
          hasMore: true // Don't stop, just retry later
        })
      }
    }

    // ─── PAUSE ───
    if (action === 'pause') {
      if (!runId) return json({ error: 'runId required' }, 400)
      await supabase.from('cleanup_runs').update({ status: 'paused' }).eq('id', runId).eq('status', 'running')
      return json({ success: true })
    }

    // ─── RESUME ───
    if (action === 'resume') {
      if (!runId) return json({ error: 'runId required' }, 400)
      await supabase.from('cleanup_runs').update({ status: 'running', retry_after: null }).eq('id', runId).eq('status', 'paused')
      return json({ success: true })
    }

    // ─── STOP ───
    if (action === 'stop') {
      if (!runId) return json({ error: 'runId required' }, 400)
      await supabase.from('cleanup_runs').update({
        status: 'done',
        finished_at: new Date().toISOString()
      }).eq('id', runId).in('status', ['running', 'paused'])
      return json({ success: true })
    }

    // ─── SCAN (lightweight estimate) ───
    if (action === 'scan') {
      if (!itemId) return json({ error: 'itemId required' }, 400)

      const { data: item } = await supabase.from('cleanup_items').select('*').eq('id', itemId).single()
      if (!item) return json({ error: 'Item not found' }, 404)

      const handler = HANDLER_REGISTRY[item.key]
      if (!handler) return json({ success: true, estimate: -1 })

      // Do a lightweight count using estimated count
      const tableMap: Record<string, { table: string; col: string }> = {
        'db:private_messages': { table: 'messenger_messages', col: 'created_at' },
        'db:group_messages': { table: 'messenger_group_messages', col: 'created_at' },
        'db:unread_receipts': { table: 'messenger_group_reads', col: 'last_read_at' },
        'db:profile_views': { table: 'profile_visits', col: 'visited_at' },
        'db:notifications': { table: 'notifications', col: 'created_at' },
      }

      const mapping = tableMap[item.key]
      if (!mapping) return json({ success: true, estimate: -1 })

      let query = supabase
        .from(mapping.table)
        .select('*', { count: 'estimated', head: true })

      if (cutoffDate) {
        query = query.lt(mapping.col, cutoffDate)
      }

      const { count, error: countErr } = await query
      if (countErr) {
        console.error(`Estimate error for ${item.key}:`, countErr)
        return json({ success: true, estimate: -1 })
      }

      return json({ success: true, estimate: count || 0 })
    }

    return json({ error: 'Invalid action' }, 400)

  } catch (error: unknown) {
    console.error('Cache cleanup error:', error)
    const errorMessage = error instanceof Error ? error.message : JSON.stringify(error)
    return json({ success: false, error: errorMessage }, 500)
  }
})

function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
}
