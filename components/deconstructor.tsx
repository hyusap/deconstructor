"use client";
import {
  ReactFlow,
  Background,
  type Edge,
  Handle,
  type Node,
  Position,
  ReactFlowProvider,
  useReactFlow,
  useNodesInitialized,
  useNodesState,
  useEdgesState,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useEffect, useState, useMemo } from "react";
import { wordSchema } from "@/utils/schema";
import { z } from "zod";
import { atom, useAtom } from "jotai";
import Spinner from "./spinner";
import { toast } from "sonner";
import { usePlausible } from "next-plausible";

const isLoadingAtom = atom(false);

type Combination = {
  id: string;
  text: string;
  definition: string;
  sourceIds: string[];
};

const WordChunkNode = ({ data }: { data: { text: string } }) => {
  const [isLoading] = useAtom(isLoadingAtom);
  return (
    <div
      className={`flex flex-col items-center transition-all duration-1000 ${
        isLoading ? "opacity-0 blur-[20px]" : ""
      }`}
    >
      <div className="text-5xl font-serif mb-1">{data.text}</div>
      <div className="w-full h-3 border border-t-0 border-white" />
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
    </div>
  );
};

const OriginNode = ({
  data,
}: {
  data: { originalWord: string; origin: string; meaning: string };
}) => {
  const [isLoading] = useAtom(isLoadingAtom);
  return (
    <div
      className={`flex flex-col items-stretch transition-all duration-1000 ${
        isLoading ? "opacity-0 blur-[20px]" : ""
      }`}
    >
      <div className="px-4 py-2 rounded-lg bg-gray-800 border border-gray-700/50 min-w-fit max-w-[180px]">
        <div className="flex flex-col items-start">
          <p className="text-lg font-serif mb-1 whitespace-nowrap">
            {data.originalWord}
          </p>
          <p className="text-xs text-gray-400 w-full">{data.origin}</p>
          <p className="text-xs text-gray-300 w-full">{data.meaning}</p>
        </div>
      </div>
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
    </div>
  );
};

const CombinedNode = ({
  data,
}: {
  data: { text: string; definition: string };
}) => {
  const [isLoading] = useAtom(isLoadingAtom);
  return (
    <div
      className={`flex flex-col items-stretch transition-all duration-1000 ${
        isLoading ? "opacity-0 blur-[20px]" : ""
      }`}
    >
      <div className="px-4 py-2 rounded-lg bg-gray-800 border border-gray-700/50 min-w-fit max-w-[250px]">
        <div className="flex flex-col items-start">
          <p className="text-xl font-serif mb-1 whitespace-nowrap">
            {data.text}
          </p>
          <p className="text-sm text-gray-300 w-full">{data.definition}</p>
        </div>
      </div>
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
    </div>
  );
};

const InputNode = ({
  data,
}: {
  data: { onSubmit: (word: string) => Promise<void> };
}) => {
  const [word, setWord] = useState("");
  const [isLoading, setIsLoading] = useAtom(isLoadingAtom);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!word.trim()) return;

    setIsLoading(true);
    await Promise.all([
      data.onSubmit(word),
      new Promise((resolve) => setTimeout(resolve, 1000)),
    ]);
    await new Promise((resolve) => setTimeout(resolve, 100));
    setIsLoading(false);
  };

  return (
    <form
      className="px-6 py-4 rounded-xl bg-gray-800/80 border border-gray-700/50 shadow-xl flex gap-3"
      onSubmit={handleSubmit}
    >
      <input
        type="text"
        value={word}
        onChange={(e) => setWord(e.target.value)}
        placeholder="Enter a word..."
        className="flex-1 px-3 py-2 rounded-lg bg-gray-900/50 border border-gray-700/50 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
        disabled={isLoading}
      />
      <button
        type="submit"
        disabled={isLoading}
        className={`w-[100px] px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium disabled:opacity-50 transition-colors flex items-center justify-center ${
          isLoading ? "cursor-not-allowed" : ""
        }`}
      >
        {isLoading ? <Spinner /> : "Analyze"}
      </button>
      {/* <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} /> */}
    </form>
  );
};

const wordChunkPadding = 3;
const originPadding = 10;
const verticalSpacing = 50;

function getLayoutedElements(nodes: Node[], edges: Edge[]) {
  const newNodes: Node[] = [];
  console.log("layouting nodes", nodes);

  const inputNode = nodes.find((node) => node.type === "inputNode");
  const inputWidth = inputNode?.measured?.width ?? 0;
  const inputHeight = inputNode?.measured?.height ?? 0;
  let nextY = inputHeight + verticalSpacing;

  if (inputNode) {
    newNodes.push({
      ...inputNode,
      position: { x: -inputWidth / 2, y: 0 },
    });
  }

  let totalWordChunkWidth = 0;

  // First pass: measure word chunks
  nodes.forEach((node) => {
    if (node.type === "wordChunk") {
      totalWordChunkWidth += (node.measured?.width ?? 0) + wordChunkPadding;
    }
  });

  // Position word chunks
  let lastWordChunkX = 0;
  nodes.forEach((node) => {
    if (node.type === "wordChunk") {
      newNodes.push({
        ...node,
        position: {
          x: -totalWordChunkWidth / 2 + lastWordChunkX,
          y: nextY,
        },
      });
      lastWordChunkX += (node.measured?.width ?? 0) + wordChunkPadding;
    }
  });

  nextY +=
    verticalSpacing +
    (nodes.find((node) => node.type === "wordChunk")?.measured?.height ?? 0);

  // Position origins
  let totalOriginWidth = 0;
  nodes.forEach((node) => {
    if (node.type === "origin") {
      totalOriginWidth += (node.measured?.width ?? 0) + originPadding;
    }
  });

  let lastOriginX = 0;
  nodes.forEach((node) => {
    if (node.type === "origin") {
      newNodes.push({
        ...node,
        position: {
          x: -totalOriginWidth / 2 + lastOriginX,
          y: nextY,
        },
      });
      lastOriginX += (node.measured?.width ?? 0) + originPadding;
    }
  });

  nextY +=
    verticalSpacing +
    Math.max(
      ...nodes
        .filter((node) => node.type === "origin")
        .map((node) => node.measured?.height ?? 0)
    );

  // Position combinations by layer
  const combinationsByY = new Map<number, Node[]>();
  nodes.forEach((node) => {
    if (node.type === "combined") {
      const layer = node.position.y / verticalSpacing - 2; // Convert y back to layer number
      if (!combinationsByY.has(layer)) {
        combinationsByY.set(layer, []);
      }
      combinationsByY.get(layer)!.push(node);
    }
  });

  // Layout each layer of combinations
  const sortedLayers = Array.from(combinationsByY.keys()).sort((a, b) => a - b);
  sortedLayers.forEach((layer) => {
    const layerNodes = combinationsByY.get(layer)!;
    let totalWidth = 0;
    layerNodes.forEach((node) => {
      totalWidth += (node.measured?.width ?? 0) + originPadding;
    });

    let lastX = 0;
    layerNodes.forEach((node) => {
      newNodes.push({
        ...node,
        position: {
          x: -totalWidth / 2 + lastX,
          y: nextY,
        },
      });
      lastX += (node.measured?.width ?? 0) + originPadding;
    });
    nextY +=
      verticalSpacing +
      Math.max(...layerNodes.map((node) => node.measured?.height ?? 0));
  });

  return { nodes: newNodes, edges };
}

// interface Definition {
//   parts: {
//     id: string;
//     text: string;
//     originalWord: string;
//     origin: string;
//     meaning: string;
//   }[];
//   combinations: {
//     id: string;
//     text: string;
//     definition: string;
//     sourceIds: string[];
//   }[];
// }

type Definition = z.infer<typeof wordSchema>;

const defaultDefinition: Definition = {
  thought: "",
  parts: [
    {
      id: "de",
      text: "de",
      originalWord: "de-",
      origin: "Latin",
      meaning: "down, off, away",
    },
    {
      id: "construc",
      text: "construc",
      originalWord: "construere",
      origin: "Latin",
      meaning: "to build, to pile up",
    },
    {
      id: "tor",
      text: "tor",
      originalWord: "-or",
      origin: "Latin",
      meaning: "agent noun, one who does an action",
    },
  ],
  combinations: [
    [
      {
        id: "constructor",
        text: "constructor",
        definition: "one who constructs or builds",
        sourceIds: ["construc", "tor"],
      },
    ],
    [
      {
        id: "deconstructor",
        text: "deconstructor",
        definition:
          "one who takes apart or analyzes the construction of something",
        sourceIds: ["de", "constructor"],
      },
    ],
  ],
};

function createInitialNodes(
  definition: Definition,
  handleWordSubmit: (word: string) => void
) {
  const initialNodes: Node[] = [];
  const initialEdges: Edge[] = [];

  initialNodes.push({
    id: "input1",
    type: "inputNode",
    position: { x: 0, y: 0 },
    data: { onSubmit: handleWordSubmit },
  });

  // Add word parts and their origins
  definition.parts.forEach((part) => {
    // Word chunk node
    initialNodes.push({
      id: part.id,
      type: "wordChunk",
      position: { x: 0, y: 0 },
      data: { text: part.text },
    });

    // Origin node - position relative to word chunk width
    const originId = `origin-${part.id}`;
    initialNodes.push({
      id: originId,
      type: "origin",
      position: { x: 0, y: 0 },
      data: {
        originalWord: part.originalWord,
        origin: part.origin,
        meaning: part.meaning,
      },
    });

    // Connect word part to origin
    initialEdges.push({
      id: `edge-${part.id}-${originId}`,
      source: part.id,
      target: originId,
      type: "straight",
      style: { stroke: "#4B5563", strokeWidth: 1 },
      animated: true,
    });
  });

  // Add combinations layer by layer
  definition.combinations.forEach((layer, layerIndex) => {
    const y = (layerIndex + 2) * verticalSpacing; // +2 to leave space for word chunks and origins

    layer.forEach((combination) => {
      // Add combination node
      initialNodes.push({
        id: combination.id,
        type: "combined",
        position: { x: 0, y },
        data: {
          text: combination.text,
          definition: combination.definition,
        },
      });

      // Add edges from all sources
      combination.sourceIds.forEach((sourceId) => {
        // If source is a word part, connect from its origin node
        const isPart = definition.parts.find((p) => p.id === sourceId);
        const actualSourceId = isPart ? `origin-${sourceId}` : sourceId;

        initialEdges.push({
          id: `edge-${actualSourceId}-${combination.id}`,
          source: actualSourceId,
          target: combination.id,
          type: "straight",
          style: { stroke: "#4B5563", strokeWidth: 1 },
          animated: true,
        });
      });
    });
  });

  return { initialNodes, initialEdges };
}

const nodeTypes = {
  wordChunk: WordChunkNode,
  origin: OriginNode,
  combined: CombinedNode,
  inputNode: InputNode,
};

function Deconstructor() {
  const [definition, setDefinition] = useState<Definition>(defaultDefinition);
  const plausible = usePlausible();
  const handleWordSubmit = async (word: string) => {
    console.log("handleWordSubmit", word);
    try {
      const data = await fetch(`/api/${word}`, {
        method: "GET",
      });
      if (!data.ok) {
        throw new Error(await data.text());
      }
      if (data.status === 203) {
        toast.info(
          "The AI had some issues, but here's what it came up with anyway."
        );
      }
      const newDefinition = (await data.json()) as Definition;
      console.log("newDefinition", newDefinition);
      console.log(JSON.stringify(newDefinition, null, 2));
      plausible("deconstruct", {
        props: {
          word,
        },
      });

      setDefinition(newDefinition);
    } catch {
      plausible("deconstruct_error", {
        props: {
          word,
        },
      });
      // console.error("Error fetching definition", error);
      toast.error("The AI doesn't like that one! Try a different word.");
    }
  };

  const { initialNodes, initialEdges } = useMemo(
    () => createInitialNodes(definition, handleWordSubmit),
    [definition]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const { fitView } = useReactFlow();
  const nodesInitialized = useNodesInitialized({ includeHiddenNodes: false });

  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges]);

  useEffect(() => {
    console.log("nodesInitialized", nodesInitialized);
    if (nodesInitialized) {
      const { nodes: layoutedNodes, edges: layoutedEdges } =
        getLayoutedElements(nodes, edges);
      setNodes(layoutedNodes);
      setEdges(layoutedEdges);
    }
  }, [nodesInitialized]);

  useEffect(() => {
    console.log("detected nodes change", nodes);
    fitView({
      duration: 1000,
    });
  }, [nodes]);

  console.log(nodes);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      nodeTypes={nodeTypes}
      className="bg-gray-900"
      proOptions={{ hideAttribution: true }}
    >
      <Background color="#333" />
    </ReactFlow>
  );
}

export default function WordDeconstructor() {
  const [isLoading] = useAtom(isLoadingAtom);

  return (
    <div
      className="h-screen bg-gray-900 text-gray-100"
      style={
        { "--loading-state": isLoading ? "1" : "0" } as React.CSSProperties
      }
    >
      <div className="h-full w-full">
        <ReactFlowProvider>
          <Deconstructor />
        </ReactFlowProvider>
      </div>
    </div>
  );
}
