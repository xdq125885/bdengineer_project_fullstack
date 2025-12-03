import React, { useMemo } from 'react'
import ReactFlow, { Background, Controls, MiniMap, useNodesState, useEdgesState, Position } from 'reactflow'
import 'reactflow/dist/style.css'
import type { TestCase } from '../types.ts'

interface Props { cases: TestCase[] }

export default function MindMapFlow({ cases }: Props) {
  const { nodes: initNodes, edges: initEdges } = useMemo(() => buildGraph(cases), [cases])
  const [nodes, , onNodesChange] = useNodesState(initNodes)
  const [edges, , onEdgesChange] = useEdgesState(initEdges)

  return (
    <div style={{ width: '100%', height: 520 }} className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
      <ReactFlow nodes={nodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} fitView>
        <Background gap={16} size={1} />
        <MiniMap pannable zoomable />
        <Controls />
      </ReactFlow>
    </div>
  )
}

function buildGraph(cases: TestCase[]) {
  const groups: Record<string, TestCase[]> = {}
  for (const c of cases) {
    const k = c.feature || '未分组'
    ;(groups[k] ||= []).push(c)
  }
  const features = Object.keys(groups)

  const nodes: any[] = []
  const edges: any[] = []

  // 布局：每个 feature 一列，纵向排列用例
  const colWidth = 360
  const rowHeight = 120

  features.forEach((feat, col) => {
    const fid = `feat-${col}`
    nodes.push({ id: fid, position: { x: col * colWidth, y: 0 }, data: { label: feat }, type: 'input', sourcePosition: Position.Bottom, draggable: true, style: nodeStyleHeader })

    const items = groups[feat]
    items.forEach((c, i) => {
      const nid = c.id
      nodes.push({ id: nid, position: { x: col * colWidth, y: (i + 1) * rowHeight }, data: { label: c.title }, targetPosition: Position.Top, sourcePosition: Position.Bottom, draggable: true, style: nodeStyleCase })
      edges.push({ id: `${fid}-${nid}`, source: fid, target: nid, animated: false })
    })
  })

  return { nodes, edges }
}

const nodeStyleHeader: React.CSSProperties = {
  padding: 8,
  borderRadius: 12,
  background: '#e0f2fe',
  border: '1px solid #bae6fd',
  fontWeight: 600,
}
const nodeStyleCase: React.CSSProperties = {
  padding: 8,
  borderRadius: 10,
  background: '#f8fafc',
  border: '1px solid #e2e8f0',
}
