"use client"

import { useState } from "react"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import type { WorkflowNode } from "@/lib/types"
import CodeEditor from "./code-editor"

interface NodeConfigPanelProps {
  node: WorkflowNode
  updateNodeData: (nodeId: string, data: any) => void
  onClose: () => void
}

export default function NodeConfigPanel({ node, updateNodeData, onClose }: NodeConfigPanelProps) {
  const [localData, setLocalData] = useState({ ...node.data })

  const handleChange = (key: string, value: any) => {
    setLocalData((prev) => ({
      ...prev,
      [key]: value,
    }))
    updateNodeData(node.id, { [key]: value })
  }

  const handleProducerConfChange = (key: string, value: any) => {
    setLocalData((prev) => ({
      ...prev,
      producerConf: {
        ...prev.producerConf,
        [key]: value,
      },
    }))
    updateNodeData(node.id, {
      producerConf: {
        ...localData.producerConf,
        [key]: value,
      },
    })
  }

  const renderInputFields = () => {
    switch (node.type) {
      case "input":
        return (
          <>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Source Connector Configuration</h3>

            <div className="space-y-2">
              <Label htmlFor="dataSource">Data Source Type</Label>
              <Select
                value={localData.dataSource || "manual"}
                onValueChange={(value) => handleChange("dataSource", value)}
              >
                <SelectTrigger id="dataSource">
                  <SelectValue placeholder="Select data source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manual Input</SelectItem>
                  <SelectItem value="api">API</SelectItem>
                  <SelectItem value="database">Database</SelectItem>
                  <SelectItem value="file">File Upload</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxReplicas">Max Replicas (for autoscaling)</Label>
              <Input
                id="maxReplicas"
                type="number"
                min="1"
                value={localData.maxReplicas || ""}
                onChange={(e) => handleChange("maxReplicas", parseInt(e.target.value) || undefined)}
                placeholder="5"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="typeClassName">Output Type Class Name</Label>
              <Input
                id="typeClassName"
                value={localData.typeClassName || ""}
                onChange={(e) => handleChange("typeClassName", e.target.value)}
                placeholder="org.apache.pulsar.common.schema.KeyValue"
              />
            </div>

            <div className="space-y-4 border border-gray-200 rounded p-3">
              <h4 className="text-xs font-semibold text-gray-600">Producer Configuration</h4>

              <div className="space-y-2">
                <Label htmlFor="maxPendingMessages">Max Pending Messages</Label>
                <Input
                  id="maxPendingMessages"
                  type="number"
                  min="1"
                  value={localData.producerConf?.maxPendingMessages || ""}
                  onChange={(e) => handleProducerConfChange("maxPendingMessages", parseInt(e.target.value) || undefined)}
                  placeholder="1000"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxPendingMessagesAcrossPartitions">Max Pending Messages Across Partitions</Label>
                <Input
                  id="maxPendingMessagesAcrossPartitions"
                  type="number"
                  min="1"
                  value={localData.producerConf?.maxPendingMessagesAcrossPartitions || ""}
                  onChange={(e) => handleProducerConfChange("maxPendingMessagesAcrossPartitions", parseInt(e.target.value) || undefined)}
                  placeholder="50000"
                />
              </div>

              <div className="flex items-center space-x-2 py-2">
                <Switch
                  id="useThreadLocalProducers"
                  checked={localData.producerConf?.useThreadLocalProducers || false}
                  onCheckedChange={(checked) => handleProducerConfChange("useThreadLocalProducers", checked)}
                />
                <Label htmlFor="useThreadLocalProducers">Use Thread Local Producers</Label>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sourceConfig">Source Configuration (JSON)</Label>
              <Textarea
                id="sourceConfig"
                value={JSON.stringify(localData.sourceConfig || {}, null, 2)}
                onChange={(e) => {
                  try {
                    const parsed = JSON.parse(e.target.value)
                    handleChange("sourceConfig", parsed)
                  } catch {
                    // Allow invalid JSON during editing
                    handleChange("sourceConfig", e.target.value)
                  }
                }}
                className="h-32 font-mono text-xs"
                placeholder='{"mongodb.hosts": "rs0/mongo:27017", "mongodb.name": "dbserver1"}'
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="jarFile">JAR File Name</Label>
              <Input
                id="jarFile"
                value={localData.jarFile || ""}
                onChange={(e) => handleChange("jarFile", e.target.value)}
                placeholder="pulsar-io-debezium-mongodb-2.7.1.nar"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="jarLocation">JAR Location</Label>
              <Input
                id="jarLocation"
                value={localData.jarLocation || ""}
                onChange={(e) => handleChange("jarLocation", e.target.value)}
                placeholder="connectors/"
              />
            </div>

            <div className="space-y-4 border border-gray-200 rounded p-3">
              <h4 className="text-xs font-semibold text-gray-600">Resource Limits</h4>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <Label htmlFor="cpuRequest">CPU Request</Label>
                  <Input
                    id="cpuRequest"
                    value={localData.cpuRequest || ""}
                    onChange={(e) => handleChange("cpuRequest", e.target.value)}
                    placeholder="0.1"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cpuLimit">CPU Limit</Label>
                  <Input
                    id="cpuLimit"
                    value={localData.cpuLimit || ""}
                    onChange={(e) => handleChange("cpuLimit", e.target.value)}
                    placeholder="0.2"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="memoryRequest">Memory Request</Label>
                  <Input
                    id="memoryRequest"
                    value={localData.memoryRequest || ""}
                    onChange={(e) => handleChange("memoryRequest", e.target.value)}
                    placeholder="1G"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="memoryLimit">Memory Limit</Label>
                  <Input
                    id="memoryLimit"
                    value={localData.memoryLimit || ""}
                    onChange={(e) => handleChange("memoryLimit", e.target.value)}
                    placeholder="1.1G"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pulsarConfig">Pulsar ConfigMap Reference</Label>
              <Input
                id="pulsarConfig"
                value={localData.pulsarConfig || ""}
                onChange={(e) => handleChange("pulsarConfig", e.target.value)}
                placeholder="test-source"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sampleData">Sample Data (JSON) - for testing</Label>
              <Textarea
                id="sampleData"
                value={localData.sampleData || ""}
                onChange={(e) => handleChange("sampleData", e.target.value)}
                className="h-24"
                placeholder='{"key": "value"}'
              />
            </div>
          </>
        )

      case "output":
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="outputType">Output Type</Label>
              <Select
                value={localData.outputType || "console"}
                onValueChange={(value) => handleChange("outputType", value)}
              >
                <SelectTrigger id="outputType">
                  <SelectValue placeholder="Select output type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="console">Console</SelectItem>
                  <SelectItem value="api">API</SelectItem>
                  <SelectItem value="database">Database</SelectItem>
                  <SelectItem value="file">File</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="outputFormat">Output Format</Label>
              <Select
                value={localData.outputFormat || "json"}
                onValueChange={(value) => handleChange("outputFormat", value)}
              >
                <SelectTrigger id="outputFormat">
                  <SelectValue placeholder="Select format" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="json">JSON</SelectItem>
                  <SelectItem value="csv">CSV</SelectItem>
                  <SelectItem value="xml">XML</SelectItem>
                  <SelectItem value="text">Plain Text</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </>
        )

      case "process":
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="processType">Process Type</Label>
              <Select
                value={localData.processType || "transform"}
                onValueChange={(value) => handleChange("processType", value)}
              >
                <SelectTrigger id="processType">
                  <SelectValue placeholder="Select process type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="transform">Transform</SelectItem>
                  <SelectItem value="filter">Filter</SelectItem>
                  <SelectItem value="aggregate">Aggregate</SelectItem>
                  <SelectItem value="sort">Sort</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="processConfig">Process Configuration (JSON)</Label>
              <Textarea
                id="processConfig"
                value={localData.processConfig || ""}
                onChange={(e) => handleChange("processConfig", e.target.value)}
                className="h-32"
                placeholder='{"operation": "value"}'
              />
            </div>
          </>
        )

      case "conditional":
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="condition">Condition</Label>
              <Input
                id="condition"
                value={localData.condition || ""}
                onChange={(e) => handleChange("condition", e.target.value)}
                placeholder="data.value > 10"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="trueLabel">True Path Label</Label>
              <Input
                id="trueLabel"
                value={localData.trueLabel || "Yes"}
                onChange={(e) => handleChange("trueLabel", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="falseLabel">False Path Label</Label>
              <Input
                id="falseLabel"
                value={localData.falseLabel || "No"}
                onChange={(e) => handleChange("falseLabel", e.target.value)}
              />
            </div>
          </>
        )

      case "code":
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="codeLanguage">Language</Label>
              <Select
                value={localData.codeLanguage || "javascript"}
                onValueChange={(value) => handleChange("codeLanguage", value)}
              >
                <SelectTrigger id="codeLanguage">
                  <SelectValue placeholder="Select language" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="javascript">JavaScript</SelectItem>
                  <SelectItem value="typescript">TypeScript</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="code">Code</Label>
              <CodeEditor
                value={
                  localData.code ||
                  "// Write your code here\nfunction process(data) {\n  // Transform data\n  return data;\n}"
                }
                onChange={(value) => handleChange("code", value)}
                language={localData.codeLanguage || "javascript"}
              />
            </div>
          </>
        )

      default:
        return null
    }
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Configure {node.data.label}</h2>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-4 flex-1 overflow-y-auto">
        <div className="space-y-2">
          <Label htmlFor="label">Node Label</Label>
          <Input id="label" value={localData.label || ""} onChange={(e) => handleChange("label", e.target.value)} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={localData.description || ""}
            onChange={(e) => handleChange("description", e.target.value)}
            placeholder="Describe what this node does"
          />
        </div>

        <div className="flex items-center space-x-2 py-2">
          <Switch
            id="required"
            checked={localData.required || false}
            onCheckedChange={(checked) => handleChange("required", checked)}
          />
          <Label htmlFor="required">Required Node</Label>
        </div>

        <div className="border-t border-gray-200 my-4"></div>

        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-gray-700">Pulsar Function Mesh Configuration</h3>

          <div className="space-y-2">
            <Label htmlFor="dockerImage">Docker Image</Label>
            <Input
              id="dockerImage"
              value={localData.dockerImage || ""}
              onChange={(e) => handleChange("dockerImage", e.target.value)}
              placeholder="streamnative/pulsar-functions-java-runner:2.7.1"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="className">Class Name</Label>
            <Input
              id="className"
              value={localData.className || ""}
              onChange={(e) => handleChange("className", e.target.value)}
              placeholder="com.example.MyFunction"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="replicas">Replicas</Label>
            <Input
              id="replicas"
              type="number"
              min="1"
              value={localData.replicas || 1}
              onChange={(e) => handleChange("replicas", parseInt(e.target.value) || 1)}
              placeholder="1"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="inputTopics">Input Topics (comma-separated)</Label>
            <Input
              id="inputTopics"
              value={localData.inputTopics?.join(", ") || ""}
              onChange={(e) =>
                handleChange(
                  "inputTopics",
                  e.target.value.split(",").map((t) => t.trim()).filter((t) => t),
                )
              }
              placeholder="persistent://public/default/input-topic"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="outputTopic">Output Topic</Label>
            <Input
              id="outputTopic"
              value={localData.outputTopic || ""}
              onChange={(e) => handleChange("outputTopic", e.target.value)}
              placeholder="persistent://public/default/output-topic"
            />
          </div>
        </div>

        <div className="border-t border-gray-200 my-4"></div>

        {renderInputFields()}
      </div>
    </div>
  )
}
