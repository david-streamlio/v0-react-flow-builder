import yaml from "js-yaml"
import type { WorkflowNode, Workflow } from "./types"
import type { Edge } from "reactflow"

interface FunctionSpec {
  apiVersion: string
  kind: string
  metadata: {
    name: string
    namespace: string
  }
  spec: {
    image: string
    className: string
    tenant?: string
    namespace?: string
    clusterName?: string
    replicas?: number
    showPreciseParallelism?: boolean
    minReplicas?: number
    maxReplicas?: number
    timeout?: number
    deadLetterTopic?: string
    funcConfig?: Record<string, any>
    logTopic?: string
    logTopicAgent?: string
    filebeatImage?: string
    autoAck?: boolean
    maxMessageRetry?: number
    processingGuarantee?: string
    forwardSourceMessageProperty?: boolean
    retainOrdering?: boolean
    retainKeyOrdering?: boolean
    subscriptionName?: string
    cleanupSubscription?: boolean
    subscriptionPosition?: string
    input?: {
      topics: string[]
      typeClassName?: string
    }
    output?: {
      topic: string
      typeClassName?: string
    }
    pulsar?: {
      pulsarConfig: string
    }
    resources?: {
      requests?: {
        cpu?: string
        memory?: string
      }
      limits?: {
        cpu?: string
        memory?: string
      }
    }
  }
}

interface SourceSpec {
  apiVersion: string
  kind: string
  metadata: {
    name: string
    namespace: string
  }
  spec: {
    image: string
    className: string
    replicas?: number
    maxReplicas?: number
    output?: {
      topic: string
      typeClassName?: string
      producerConf?: {
        maxPendingMessages?: number
        maxPendingMessagesAcrossPartitions?: number
        useThreadLocalProducers?: boolean
      }
    }
    sourceConfig?: Record<string, string>
    pulsar?: {
      pulsarConfig: string
    }
    java?: {
      jar?: string
      jarLocation?: string
    }
    resources?: {
      requests?: {
        cpu?: string
        memory?: string
      }
      limits?: {
        cpu?: string
        memory?: string
      }
    }
  }
}

interface SinkSpec {
  apiVersion: string
  kind: string
  metadata: {
    name: string
    namespace: string
  }
  spec: {
    image: string
    className: string
    tenant?: string
    clusterName?: string
    replicas?: number
    showPreciseParallelism?: boolean
    minReplicas?: number
    maxReplicas?: number
    input?: {
      topics: string[]
      typeClassName?: string
    }
    sinkConfig?: Record<string, any>
    timeout?: number
    negativeAckRedeliveryDelayMs?: number
    autoAck?: boolean
    maxMessageRetry?: number
    processingGuarantee?: string
    retainOrdering?: boolean
    retainKeyOrdering?: boolean
    deadLetterTopic?: string
    subscriptionName?: string
    cleanupSubscription?: boolean
    subscriptionPosition?: string
    logTopic?: string
    logTopicAgent?: string
    filebeatImage?: string
    pulsar?: {
      pulsarConfig: string
    }
    resources?: {
      requests?: {
        cpu?: string
        memory?: string
      }
      limits?: {
        cpu?: string
        memory?: string
      }
    }
  }
}

interface FunctionMeshSpec {
  apiVersion: string
  kind: string
  metadata: {
    name: string
    namespace: string
  }
  spec: {
    sources?: SourceSpec[]
    functions?: FunctionSpec[]
    sinks?: SinkSpec[]
  }
}

/**
 * Generates a unique function name from a node
 */
function generateFunctionName(node: WorkflowNode): string {
  // Convert label to lowercase and replace spaces with hyphens
  const baseName = node.data.label.toLowerCase().replace(/\s+/g, "-")
  // Add node ID to ensure uniqueness
  return `${baseName}-${node.id}`
}

/**
 * Gets input topics for a node based on incoming edges
 */
function getInputTopics(nodeId: string, edges: Edge[], nodes: WorkflowNode[]): string[] {
  // If the node has explicitly defined input topics, use those
  const node = nodes.find((n) => n.id === nodeId)
  if (node?.data.inputTopics && node.data.inputTopics.length > 0) {
    return node.data.inputTopics
  }

  // Otherwise, derive from incoming edges
  const incomingEdges = edges.filter((edge) => edge.target === nodeId)
  const topics: string[] = []

  for (const edge of incomingEdges) {
    const sourceNode = nodes.find((n) => n.id === edge.source)
    if (sourceNode) {
      // Use the source node's output topic if defined
      if (sourceNode.data.outputTopic) {
        topics.push(sourceNode.data.outputTopic)
      } else {
        // Generate a topic name based on the edge
        const topicName = `persistent://public/default/${generateFunctionName(sourceNode)}-output`
        topics.push(topicName)
      }
    }
  }

  return topics
}

/**
 * Gets output topic for a node based on outgoing edges or explicit configuration
 */
function getOutputTopic(node: WorkflowNode, edges: Edge[]): string | undefined {
  // If explicitly defined, use that
  if (node.data.outputTopic) {
    return node.data.outputTopic
  }

  // Check if there are outgoing edges
  const hasOutgoingEdges = edges.some((edge) => edge.source === node.id)

  // If there are outgoing edges, generate a topic name
  if (hasOutgoingEdges) {
    return `persistent://public/default/${generateFunctionName(node)}-output`
  }

  // No output topic needed if no outgoing connections
  return undefined
}

/**
 * Converts an Input node to a Pulsar Source spec
 */
function nodeToSourceSpec(
  node: WorkflowNode,
  edges: Edge[],
  nodes: WorkflowNode[],
  namespace: string = "default",
): SourceSpec | null {
  // Skip nodes that don't have required fields
  if (!node.data.dockerImage || !node.data.className) {
    console.warn(`Node ${node.id} (${node.data.label}) missing dockerImage or className, skipping...`)
    return null
  }

  const outputTopic = getOutputTopic(node, edges)

  const spec: SourceSpec = {
    apiVersion: "compute.functionmesh.io/v1alpha1",
    kind: "Source",
    metadata: {
      name: generateFunctionName(node),
      namespace,
    },
    spec: {
      image: node.data.dockerImage,
      className: node.data.className,
      replicas: node.data.replicas || 1,
    },
  }

  // Add maxReplicas if specified
  if (node.data.maxReplicas) {
    spec.spec.maxReplicas = node.data.maxReplicas
  }

  // Add output configuration if there's an output topic
  if (outputTopic) {
    spec.spec.output = {
      topic: outputTopic,
      typeClassName: node.data.typeClassName || "org.apache.pulsar.common.schema.KeyValue",
    }

    // Add producer configuration if specified
    if (node.data.producerConf) {
      spec.spec.output.producerConf = {}
      if (node.data.producerConf.maxPendingMessages !== undefined) {
        spec.spec.output.producerConf.maxPendingMessages = node.data.producerConf.maxPendingMessages
      }
      if (node.data.producerConf.maxPendingMessagesAcrossPartitions !== undefined) {
        spec.spec.output.producerConf.maxPendingMessagesAcrossPartitions =
          node.data.producerConf.maxPendingMessagesAcrossPartitions
      }
      if (node.data.producerConf.useThreadLocalProducers !== undefined) {
        spec.spec.output.producerConf.useThreadLocalProducers = node.data.producerConf.useThreadLocalProducers
      }
    }
  }

  // Add source configuration if specified
  if (node.data.sourceConfig && Object.keys(node.data.sourceConfig).length > 0) {
    spec.spec.sourceConfig = node.data.sourceConfig
  }

  // Add Pulsar configuration
  if (node.data.pulsarConfig) {
    spec.spec.pulsar = {
      pulsarConfig: node.data.pulsarConfig,
    }
  } else {
    spec.spec.pulsar = {
      pulsarConfig: "pulsar-cluster",
    }
  }

  // Add Java configuration if specified
  if (node.data.jarFile || node.data.jarLocation) {
    spec.spec.java = {}
    if (node.data.jarFile) {
      const jarPath = node.data.jarLocation
        ? `${node.data.jarLocation}${node.data.jarFile}`
        : node.data.jarFile
      spec.spec.java.jar = jarPath
    }
    if (node.data.jarLocation) {
      spec.spec.java.jarLocation = node.data.jarLocation
    }
  }

  // Add resource limits if specified
  if (node.data.cpuRequest || node.data.cpuLimit || node.data.memoryRequest || node.data.memoryLimit) {
    spec.spec.resources = {}
    if (node.data.cpuRequest || node.data.memoryRequest) {
      spec.spec.resources.requests = {}
      if (node.data.cpuRequest) spec.spec.resources.requests.cpu = node.data.cpuRequest
      if (node.data.memoryRequest) spec.spec.resources.requests.memory = node.data.memoryRequest
    }
    if (node.data.cpuLimit || node.data.memoryLimit) {
      spec.spec.resources.limits = {}
      if (node.data.cpuLimit) spec.spec.resources.limits.cpu = node.data.cpuLimit
      if (node.data.memoryLimit) spec.spec.resources.limits.memory = node.data.memoryLimit
    }
  }

  return spec
}

/**
 * Converts a workflow node to a Pulsar Function spec
 */
function nodeToFunctionSpec(
  node: WorkflowNode,
  edges: Edge[],
  nodes: WorkflowNode[],
  namespace: string = "default",
): FunctionSpec | null {
  // Skip nodes that don't have required fields
  if (!node.data.dockerImage || !node.data.className) {
    console.warn(`Node ${node.id} (${node.data.label}) missing dockerImage or className, skipping...`)
    return null
  }

  const inputTopics = getInputTopics(node.id, edges, nodes)
  const outputTopic = getOutputTopic(node, edges)

  const spec: FunctionSpec = {
    apiVersion: "compute.functionmesh.io/v1alpha1",
    kind: "Function",
    metadata: {
      name: generateFunctionName(node),
      namespace,
    },
    spec: {
      image: node.data.dockerImage,
      className: node.data.className,
      replicas: node.data.replicas || 1,
      pulsar: {
        pulsarConfig: node.data.pulsarConfig || "pulsar-cluster",
      },
    },
  }

  // Add optional Function-specific fields
  if (node.data.tenant) spec.spec.tenant = node.data.tenant
  if (node.data.namespace) spec.spec.namespace = node.data.namespace
  if (node.data.clusterName) spec.spec.clusterName = node.data.clusterName
  if (node.data.showPreciseParallelism !== undefined) {
    spec.spec.showPreciseParallelism = node.data.showPreciseParallelism
  }
  if (node.data.minReplicas !== undefined) spec.spec.minReplicas = node.data.minReplicas
  if (node.data.maxReplicas !== undefined) spec.spec.maxReplicas = node.data.maxReplicas
  if (node.data.timeout !== undefined) spec.spec.timeout = node.data.timeout
  if (node.data.deadLetterTopic) spec.spec.deadLetterTopic = node.data.deadLetterTopic
  if (node.data.logTopic) spec.spec.logTopic = node.data.logTopic
  if (node.data.logTopicAgent) spec.spec.logTopicAgent = node.data.logTopicAgent
  if (node.data.filebeatImage) spec.spec.filebeatImage = node.data.filebeatImage
  if (node.data.autoAck !== undefined) spec.spec.autoAck = node.data.autoAck
  if (node.data.maxMessageRetry !== undefined) spec.spec.maxMessageRetry = node.data.maxMessageRetry
  if (node.data.processingGuarantee) spec.spec.processingGuarantee = node.data.processingGuarantee
  if (node.data.forwardSourceMessageProperty !== undefined) {
    spec.spec.forwardSourceMessageProperty = node.data.forwardSourceMessageProperty
  }
  if (node.data.retainOrdering !== undefined) spec.spec.retainOrdering = node.data.retainOrdering
  if (node.data.retainKeyOrdering !== undefined) spec.spec.retainKeyOrdering = node.data.retainKeyOrdering
  if (node.data.subscriptionName) spec.spec.subscriptionName = node.data.subscriptionName
  if (node.data.cleanupSubscription !== undefined) {
    spec.spec.cleanupSubscription = node.data.cleanupSubscription
  }
  if (node.data.subscriptionPosition) spec.spec.subscriptionPosition = node.data.subscriptionPosition

  // Parse funcConfig if provided (expecting YAML string)
  if (node.data.funcConfig) {
    try {
      spec.spec.funcConfig = yaml.load(node.data.funcConfig) as Record<string, any>
    } catch (error) {
      console.warn(`Failed to parse funcConfig for node ${node.id}:`, error)
    }
  }

  // Add resource limits if specified
  if (node.data.cpuRequest || node.data.cpuLimit || node.data.memoryRequest || node.data.memoryLimit) {
    spec.spec.resources = {}
    if (node.data.cpuRequest || node.data.memoryRequest) {
      spec.spec.resources.requests = {}
      if (node.data.cpuRequest) spec.spec.resources.requests.cpu = node.data.cpuRequest
      if (node.data.memoryRequest) spec.spec.resources.requests.memory = node.data.memoryRequest
    }
    if (node.data.cpuLimit || node.data.memoryLimit) {
      spec.spec.resources.limits = {}
      if (node.data.cpuLimit) spec.spec.resources.limits.cpu = node.data.cpuLimit
      if (node.data.memoryLimit) spec.spec.resources.limits.memory = node.data.memoryLimit
    }
  }

  // Add input configuration if there are input topics
  if (inputTopics.length > 0) {
    spec.spec.input = {
      topics: inputTopics,
      typeClassName: "java.lang.String",
    }
  }

  // Add output configuration if there's an output topic
  if (outputTopic) {
    spec.spec.output = {
      topic: outputTopic,
      typeClassName: "java.lang.String",
    }
  }

  return spec
}

/**
 * Converts an Output node to a Pulsar Sink spec
 */
function nodeToSinkSpec(
  node: WorkflowNode,
  edges: Edge[],
  nodes: WorkflowNode[],
  namespace: string = "default",
): SinkSpec | null {
  // Skip nodes that don't have required fields
  if (!node.data.dockerImage || !node.data.className) {
    console.warn(`Node ${node.id} (${node.data.label}) missing dockerImage or className, skipping...`)
    return null
  }

  const inputTopics = getInputTopics(node.id, edges, nodes)

  const spec: SinkSpec = {
    apiVersion: "compute.functionmesh.io/v1alpha1",
    kind: "Sink",
    metadata: {
      name: generateFunctionName(node),
      namespace,
    },
    spec: {
      image: node.data.dockerImage,
      className: node.data.className,
      replicas: node.data.replicas || 1,
      pulsar: {
        pulsarConfig: node.data.pulsarConfig || "pulsar-cluster",
      },
    },
  }

  // Add optional Sink-specific fields
  if (node.data.tenant) spec.spec.tenant = node.data.tenant
  if (node.data.clusterName) spec.spec.clusterName = node.data.clusterName
  if (node.data.showPreciseParallelism !== undefined) {
    spec.spec.showPreciseParallelism = node.data.showPreciseParallelism
  }
  if (node.data.minReplicas !== undefined) spec.spec.minReplicas = node.data.minReplicas
  if (node.data.maxReplicas !== undefined) spec.spec.maxReplicas = node.data.maxReplicas
  if (node.data.logTopic) spec.spec.logTopic = node.data.logTopic
  if (node.data.logTopicAgent) spec.spec.logTopicAgent = node.data.logTopicAgent
  if (node.data.filebeatImage) spec.spec.filebeatImage = node.data.filebeatImage
  if (node.data.timeout !== undefined) spec.spec.timeout = node.data.timeout
  if (node.data.negativeAckRedeliveryDelayMs !== undefined) {
    spec.spec.negativeAckRedeliveryDelayMs = node.data.negativeAckRedeliveryDelayMs
  }
  if (node.data.autoAck !== undefined) spec.spec.autoAck = node.data.autoAck
  if (node.data.maxMessageRetry !== undefined) spec.spec.maxMessageRetry = node.data.maxMessageRetry
  if (node.data.processingGuarantee) spec.spec.processingGuarantee = node.data.processingGuarantee
  if (node.data.retainOrdering !== undefined) spec.spec.retainOrdering = node.data.retainOrdering
  if (node.data.retainKeyOrdering !== undefined) spec.spec.retainKeyOrdering = node.data.retainKeyOrdering
  if (node.data.deadLetterTopic) spec.spec.deadLetterTopic = node.data.deadLetterTopic
  if (node.data.subscriptionName) spec.spec.subscriptionName = node.data.subscriptionName
  if (node.data.cleanupSubscription !== undefined) {
    spec.spec.cleanupSubscription = node.data.cleanupSubscription
  }
  if (node.data.subscriptionPosition) spec.spec.subscriptionPosition = node.data.subscriptionPosition

  // Parse sinkConfig if provided (expecting YAML string)
  if (node.data.sinkConfig) {
    try {
      spec.spec.sinkConfig = yaml.load(node.data.sinkConfig) as Record<string, any>
    } catch (error) {
      console.warn(`Failed to parse sinkConfig for node ${node.id}:`, error)
    }
  }

  // Add resource limits if specified
  if (node.data.cpuRequest || node.data.cpuLimit || node.data.memoryRequest || node.data.memoryLimit) {
    spec.spec.resources = {}
    if (node.data.cpuRequest || node.data.memoryRequest) {
      spec.spec.resources.requests = {}
      if (node.data.cpuRequest) spec.spec.resources.requests.cpu = node.data.cpuRequest
      if (node.data.memoryRequest) spec.spec.resources.requests.memory = node.data.memoryRequest
    }
    if (node.data.cpuLimit || node.data.memoryLimit) {
      spec.spec.resources.limits = {}
      if (node.data.cpuLimit) spec.spec.resources.limits.cpu = node.data.cpuLimit
      if (node.data.memoryLimit) spec.spec.resources.limits.memory = node.data.memoryLimit
    }
  }

  // Add input configuration if there are input topics
  if (inputTopics.length > 0) {
    spec.spec.input = {
      topics: inputTopics,
      typeClassName: "java.lang.String",
    }
  }

  return spec
}

/**
 * Exports a workflow to a Pulsar Function Mesh YAML file
 */
export function exportToFunctionMesh(
  workflow: Workflow,
  meshName: string = "workflow-function-mesh",
  namespace: string = "default",
): string {
  const { nodes, edges } = workflow

  // Separate sources, sinks, and functions based on node type
  const sources: SourceSpec[] = []
  const sinks: SinkSpec[] = []
  const functions: FunctionSpec[] = []

  for (const node of nodes) {
    // Input nodes become Source connectors
    if (node.type === "input") {
      const sourceSpec = nodeToSourceSpec(node, edges, nodes, namespace)
      if (sourceSpec) {
        sources.push(sourceSpec)
      }
    } else if (node.type === "output") {
      // Output nodes become Sink connectors
      const sinkSpec = nodeToSinkSpec(node, edges, nodes, namespace)
      if (sinkSpec) {
        sinks.push(sinkSpec)
      }
    } else {
      // All other nodes become Functions
      const functionSpec = nodeToFunctionSpec(node, edges, nodes, namespace)
      if (functionSpec) {
        functions.push(functionSpec)
      }
    }
  }

  const totalResources = sources.length + sinks.length + functions.length

  if (totalResources === 0) {
    throw new Error(
      "No valid sources, sinks, or functions to export. Ensure all nodes have dockerImage and className configured.",
    )
  }

  // If there's only one resource, export it directly
  if (totalResources === 1) {
    let singleResource: SourceSpec | SinkSpec | FunctionSpec
    if (sources.length === 1) {
      singleResource = sources[0]
    } else if (sinks.length === 1) {
      singleResource = sinks[0]
    } else {
      singleResource = functions[0]
    }
    return yaml.dump(singleResource, {
      indent: 2,
      lineWidth: 120,
      noRefs: true,
    })
  }

  // If there are multiple resources, create a FunctionMesh
  const functionMesh: FunctionMeshSpec = {
    apiVersion: "compute.functionmesh.io/v1alpha1",
    kind: "FunctionMesh",
    metadata: {
      name: meshName,
      namespace,
    },
    spec: {},
  }

  if (sources.length > 0) {
    functionMesh.spec.sources = sources
  }

  if (sinks.length > 0) {
    functionMesh.spec.sinks = sinks
  }

  if (functions.length > 0) {
    functionMesh.spec.functions = functions
  }

  return yaml.dump(functionMesh, {
    indent: 2,
    lineWidth: 120,
    noRefs: true,
  })
}

/**
 * Downloads a YAML string as a file
 */
export function downloadYamlFile(yamlContent: string, filename: string = "function-mesh.yaml") {
  const blob = new Blob([yamlContent], { type: "text/yaml;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Exports individual Source/Sink/Function specs for each node (useful for separate deployment)
 */
export function exportToIndividualFunctions(
  workflow: Workflow,
  namespace: string = "default",
): Map<string, string> {
  const { nodes, edges } = workflow
  const resourceYamls = new Map<string, string>()

  for (const node of nodes) {
    let spec: SourceSpec | SinkSpec | FunctionSpec | null = null

    // Input nodes become Source connectors
    if (node.type === "input") {
      spec = nodeToSourceSpec(node, edges, nodes, namespace)
    } else if (node.type === "output") {
      // Output nodes become Sink connectors
      spec = nodeToSinkSpec(node, edges, nodes, namespace)
    } else {
      // All other nodes become Functions
      spec = nodeToFunctionSpec(node, edges, nodes, namespace)
    }

    if (spec) {
      const yamlContent = yaml.dump(spec, {
        indent: 2,
        lineWidth: 120,
        noRefs: true,
      })
      resourceYamls.set(generateFunctionName(node), yamlContent)
    }
  }

  return resourceYamls
}
