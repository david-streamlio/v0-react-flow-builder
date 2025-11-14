import type { Node } from "reactflow"

export interface NodeData {
  label: string
  description?: string
  required?: boolean

  // Pulsar Function Mesh properties (common to all nodes)
  dockerImage?: string
  className?: string
  replicas?: number
  inputTopics?: string[]
  outputTopic?: string

  // Input node properties
  dataSource?: "manual" | "api" | "database" | "file"
  sampleData?: string

  // Output node properties
  outputType?: "console" | "api" | "database" | "file"
  outputFormat?: "json" | "csv" | "xml" | "text"

  // Process node properties
  processType?: "transform" | "filter" | "aggregate" | "sort"
  processConfig?: string

  // Conditional node properties
  condition?: string
  trueLabel?: string
  falseLabel?: string

  // Code node properties
  codeLanguage?: "javascript" | "typescript"
  code?: string
}

export type WorkflowNode = Node<NodeData>

export interface Workflow {
  nodes: WorkflowNode[]
  edges: any[]
}
