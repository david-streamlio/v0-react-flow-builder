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

  // Input node properties (UI-level)
  dataSource?: "manual" | "api" | "database" | "file"
  sampleData?: string

  // Source CRD properties (for Input nodes when exporting)
  maxReplicas?: number
  typeClassName?: string // Output type class name (e.g., org.apache.pulsar.common.schema.KeyValue)
  producerConf?: {
    maxPendingMessages?: number
    maxPendingMessagesAcrossPartitions?: number
    useThreadLocalProducers?: boolean
  }
  sourceConfig?: Record<string, string> // Connector-specific configuration
  jarLocation?: string // JAR location for Java connectors
  jarFile?: string // JAR file name
  cpuRequest?: string // e.g., "0.1"
  cpuLimit?: string // e.g., "0.2"
  memoryRequest?: string // e.g., "1G"
  memoryLimit?: string // e.g., "1.1G"
  pulsarConfig?: string // Reference to Pulsar ConfigMap

  // Output node properties (UI-level)
  outputType?: "console" | "api" | "database" | "file"
  outputFormat?: "json" | "csv" | "xml" | "text"

  // Sink CRD properties (for Output nodes when exporting)
  tenant?: string
  clusterName?: string
  showPreciseParallelism?: boolean
  minReplicas?: number
  logTopic?: string
  logTopicAgent?: "runtime" | "sidecar"
  filebeatImage?: string
  sinkConfig?: string // YAML format configuration
  timeout?: number
  negativeAckRedeliveryDelayMs?: number
  autoAck?: boolean
  maxMessageRetry?: number
  processingGuarantee?: "atleast_once" | "atmost_once" | "effectively_once" | "manual"
  retainOrdering?: boolean
  retainKeyOrdering?: boolean
  deadLetterTopic?: string
  subscriptionName?: string
  cleanupSubscription?: boolean
  subscriptionPosition?: string

  // Process node properties (UI-level)
  processType?: "transform" | "filter" | "aggregate" | "sort"
  processConfig?: string

  // Function CRD properties (for Process nodes when exporting)
  // Note: tenant, showPreciseParallelism, minReplicas, timeout, deadLetterTopic, logTopic, logTopicAgent,
  // filebeatImage, autoAck, maxMessageRetry, processingGuarantee, retainOrdering, retainKeyOrdering,
  // subscriptionName, cleanupSubscription, subscriptionPosition are shared with Sink CRD above
  namespace?: string
  funcConfig?: string // YAML format configuration
  forwardSourceMessageProperty?: boolean

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
