# Pulsar Function Mesh Integration

This React Flow Builder has been enhanced to support development of Apache Pulsar Function Mesh applications. You can now visually design workflows and export them as Function Mesh YAML specifications compatible with the `compute.functionmesh.io/v1alpha1` CRD.

## Features

### 1. **Pulsar Function Mesh Configuration**

Each node in the workflow can be configured with the following Pulsar Function Mesh properties:

- **Docker Image**: The container image for the Pulsar Function (e.g., `streamnative/pulsar-functions-java-runner:2.7.1`)
- **Class Name**: The fully qualified class name of the function (e.g., `com.example.MyFunction`)
- **Replicas**: Number of function instances to run (default: 1)
- **Input Topics**: Comma-separated list of input Pulsar topics
- **Output Topic**: The output Pulsar topic

### 2. **Automatic Topic Inference**

When you connect nodes with edges:

- **Input Topics**: Automatically derived from incoming connections. If a node has edges pointing to it, the system will use the output topics of the source nodes as inputs.
- **Output Topics**: Automatically generated based on outgoing connections. If not explicitly set, the system generates topic names like `persistent://public/default/{function-name}-output`.

### 3. **YAML Export**

Click the **"Export YAML"** button to:

1. Convert your visual workflow to a Function Mesh YAML specification
2. Download the YAML file automatically
3. Save the workflow to localStorage for quick reload

## Export Behavior

### Single Function
If your workflow contains only one node, it exports as a single `Function` resource:

```yaml
apiVersion: compute.functionmesh.io/v1alpha1
kind: Function
metadata:
  name: my-function
  namespace: default
spec:
  image: streamnative/pulsar-functions-java-runner:2.7.1
  className: com.example.MyFunction
  replicas: 1
  input:
    topics:
      - persistent://public/default/input-topic
    typeClassName: java.lang.String
  output:
    topic: persistent://public/default/output-topic
    typeClassName: java.lang.String
  pulsar:
    pulsarConfig: pulsar-cluster
```

### Multiple Functions (Function Mesh)
If your workflow contains multiple nodes, it exports as a `FunctionMesh` resource containing all functions:

```yaml
apiVersion: compute.functionmesh.io/v1alpha1
kind: FunctionMesh
metadata:
  name: workflow-function-mesh
  namespace: default
spec:
  functions:
    - apiVersion: compute.functionmesh.io/v1alpha1
      kind: Function
      metadata:
        name: function-1
        namespace: default
      spec:
        image: streamnative/pulsar-functions-java-runner:2.7.1
        className: com.example.Function1
        # ... rest of spec
    - apiVersion: compute.functionmesh.io/v1alpha1
      kind: Function
      metadata:
        name: function-2
        namespace: default
      spec:
        image: streamnative/pulsar-functions-java-runner:2.7.1
        className: com.example.Function2
        # ... rest of spec
```

## Usage Workflow

1. **Drag nodes** from the Node Library onto the canvas
2. **Connect nodes** by dragging from output handles to input handles
3. **Click on a node** to open the configuration panel
4. **Configure Pulsar Function Mesh properties**:
   - Set the Docker Image
   - Set the Class Name (required for export)
   - Optionally set Replicas, Input Topics, and Output Topic
   - Configure node-specific properties (e.g., process type, code, etc.)
5. **Click "Export YAML"** to download the Function Mesh specification
6. **Deploy** the YAML file to your Kubernetes cluster with Function Mesh Operator installed

## Example: Building a Simple Pipeline

### Step 1: Create Nodes
1. Add an **Input Node** (e.g., "Data Source")
2. Add a **Process Node** (e.g., "Transform")
3. Add an **Output Node** (e.g., "Data Sink")

### Step 2: Connect Nodes
Connect them in sequence: Input → Process → Output

### Step 3: Configure Each Node

**Input Node:**
- Docker Image: `streamnative/pulsar-functions-java-runner:2.7.1`
- Class Name: `com.example.DataSourceFunction`
- Output Topic: `persistent://public/default/raw-data`

**Process Node:**
- Docker Image: `streamnative/pulsar-functions-java-runner:2.7.1`
- Class Name: `com.example.TransformFunction`
- (Input and output topics will be auto-derived)

**Output Node:**
- Docker Image: `streamnative/pulsar-functions-java-runner:2.7.1`
- Class Name: `com.example.DataSinkFunction`
- Output Topic: `persistent://public/default/processed-data`

### Step 4: Export
Click "Export YAML" to download `function-mesh.yaml`

### Step 5: Deploy
```bash
kubectl apply -f function-mesh.yaml
```

## Requirements

All nodes **must** have the following configured for successful YAML export:
- **Docker Image**
- **Class Name**

Nodes missing these fields will be skipped during export with a warning in the console.

## Advanced Features

### Custom Namespace
The export utility defaults to the `default` namespace but can be customized by modifying the export function call in the code.

### Pulsar Config
All functions use `pulsar-cluster` as the default Pulsar configuration. This can be customized in the export utility.

### Type Class Names
Input and output type class names default to `java.lang.String`. This can be extended in future versions.

## Technical Implementation

The Function Mesh export functionality is implemented in:
- **Type definitions**: `/lib/types.ts`
- **Export utility**: `/lib/function-mesh-export.ts`
- **Workflow builder**: `/components/workflow-builder.tsx`
- **Node configuration**: `/components/node-config-panel.tsx`

## References

- [Function Mesh Documentation](https://functionmesh.io/)
- [Function Mesh CRD Reference](https://functionmesh.io/docs/function-mesh/function-mesh-crd/)
- [Apache Pulsar Functions](https://pulsar.apache.org/docs/functions-overview/)
