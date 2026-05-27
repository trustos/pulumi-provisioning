<script lang="ts">
  import { Input } from '$lib/components/ui/input';
  import { Button } from '$lib/components/ui/button';
  import * as Select from '$lib/components/ui/select';
  import {
    parseNlbPortList,
    serializeNlbPortList,
    type NlbPortEntry,
    type NlbProtocol,
  } from '$lib/blueprint-graph/nlb-port-list';

  let { value = $bindable('') }: { value: string } = $props();

  let entries = $state<NlbPortEntry[]>(parseNlbPortList(value));

  function sync() {
    value = serializeNlbPortList(entries);
  }

  function addPort() {
    entries.push({ name: '', protocol: 'TCP', port: 0, healthCheckPort: 0, ppv2: false });
  }

  function removePort(idx: number) {
    entries.splice(idx, 1);
    sync();
  }

  function nameError(name: string, idx: number): string {
    if (!name) return '';
    if (!/^[a-z0-9][a-z0-9-]*$/.test(name)) return 'Lowercase alphanumeric + hyphens';
    if (entries.some((e, i) => i !== idx && e.name === name)) return 'Duplicate name';
    return '';
  }

  function portWarning(port: number): string {
    if (port >= 41820 && port <= 41853) return 'Overlaps agent port range';
    return '';
  }
</script>

<div class="space-y-2">
  <div class="grid grid-cols-[1fr_100px_80px_80px_60px_32px] gap-2 text-xs font-medium text-muted-foreground">
    <span>Name</span>
    <span>Protocol</span>
    <span>Port</span>
    <span>Health Check</span>
    <span title="PROXY protocol v2 — forwards real client IP from NLB to backend. TCP-only.">PPv2</span>
    <span></span>
  </div>

  {#each entries as entry, idx}
    {@const err = nameError(entry.name, idx)}
    {@const warn = portWarning(entry.port) || portWarning(entry.healthCheckPort)}
    <div class="grid grid-cols-[1fr_100px_80px_80px_60px_32px] gap-2 items-start">
      <div>
        <Input
          class="h-8 text-sm {err ? 'border-destructive' : ''}"
          placeholder="name"
          value={entry.name}
          oninput={(e: Event) => { entry.name = (e.target as HTMLInputElement).value.toLowerCase().replace(/[^a-z0-9-]/g, ''); sync(); }}
        />
        {#if err}
          <p class="text-xs text-destructive mt-0.5">{err}</p>
        {/if}
      </div>
      <Select.Root
        type="single"
        value={entry.protocol}
        onValueChange={(v) => {
          if (!v) return;
          entry.protocol = v as NlbProtocol;
          if (entry.protocol !== 'TCP') entry.ppv2 = false;
          sync();
        }}
      >
        <Select.Trigger class="h-8 text-sm">
          {entry.protocol === 'TCP_AND_UDP' ? 'Both' : entry.protocol}
        </Select.Trigger>
        <Select.Content>
          <Select.Item value="TCP">TCP</Select.Item>
          <Select.Item value="UDP">UDP</Select.Item>
          <Select.Item value="TCP_AND_UDP">Both</Select.Item>
        </Select.Content>
      </Select.Root>
      <div>
        <Input
          type="number"
          class="h-8 text-sm {warn ? 'border-warning' : ''}"
          placeholder="port"
          min="0"
          max="65535"
          value={String(entry.port || '')}
          oninput={(e: Event) => {
            entry.port = parseInt((e.target as HTMLInputElement).value) || 0;
            if (entry.port > 0 && !entry.healthCheckPort) entry.healthCheckPort = entry.port;
            sync();
          }}
        />
      </div>
      <div>
        <Input
          type="number"
          class="h-8 text-sm {warn ? 'border-warning' : ''}"
          placeholder="health"
          min="0"
          max="65535"
          value={String(entry.healthCheckPort || '')}
          oninput={(e: Event) => { entry.healthCheckPort = parseInt((e.target as HTMLInputElement).value) || 0; sync(); }}
        />
      </div>
      <div class="flex items-center justify-center h-8">
        <input
          type="checkbox"
          class="h-4 w-4 rounded border-input accent-primary disabled:opacity-40 disabled:cursor-not-allowed"
          checked={entry.ppv2}
          disabled={entry.protocol !== 'TCP'}
          title={entry.protocol !== 'TCP' ? 'PPv2 is TCP-only' : 'Wrap NLB connections in PROXY protocol v2 header'}
          onchange={(e: Event) => { entry.ppv2 = (e.target as HTMLInputElement).checked; sync(); }}
        />
      </div>
      <Button variant="ghost" size="sm" class="h-8 w-8 p-0 text-muted-foreground hover:text-destructive" onclick={() => removePort(idx)}>
        ✕
      </Button>
    </div>
    {#if warn}
      <p class="text-xs text-warning -mt-1 ml-1">{warn}</p>
    {/if}
  {/each}

  <div class="flex gap-2">
    <Button variant="outline" size="sm" onclick={addPort}>
      + Add Port
    </Button>
  </div>
</div>
