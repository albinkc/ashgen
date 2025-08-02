<script>
    import { onMount, tick } from "svelte";
    import { flip } from "svelte/animate";
    import { dndzone } from "svelte-dnd-action";

    // Data types and modifiers based on Ash framework
    const attributeTypes = [
        "string",
        "integer",
        "decimal",
        "float",
        "boolean",
        "date",
        "datetime",
        "uuid",
        "atom",
        "map",
        "json",
    ];
    const attributeModifiers = [
        "required",
        "public",
        "sensitive",
        "primary_key",
        // "array",
    ];
    const relationshipTypes = [
        "belongs_to",
        "has_one",
        "has_many",
        "many_to_many",
    ];
    const relationshipModifiers = ["required", "sensitive", "primary_key"];
    const defaultActionTypes = ["create", "read", "update", "destroy"];
    const idTypes = ["uuid-v7", "uuid", "integer", "none"];
    const builtinExtensions = [
        "Ash.Policy.Authorizer",
        "json_api",
        "graphql",
        "postgres",
        "sqlite",
        "mysql",
        "ets",
        "mnesia",
        "embedded",
    ];

    let resources = [];
    let activeResourceIndex = 0;

    // Re-active view of the active resource, plus an always-fresh command string
    $: resource = resources[activeResourceIndex] || {};
    $: command = generateCommand(resource);

    // Get all resource names for autocomplete
    $: resourceNames = resources
        .map((r) => r.name)
        .filter((name) => name && name.trim() !== "");

    // Load from localStorage on mount
    onMount(() => {
        const saved = localStorage.getItem("ash-resource-generator");
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                resources = parsed.resources || [];
                if (resources.length === 0) {
                    addNewResource();
                }
            } catch (e) {
                addNewResource();
            }
        } else {
            addNewResource();
        }
    });

    // Save to localStorage whenever resources change
    $: if (resources.length > 0) {
        localStorage.setItem(
            "ash-resource-generator",
            JSON.stringify({ resources }),
        );
    }

    /** helpers */
    const blankAttribute = () => ({
        id: Date.now() + Math.random(), // Add randomness to ensure unique IDs
        name: "",
        type: "string",
        modifiers: [],
    });

    const blankRelationship = () => ({
        id: Date.now() + Math.random(), // Add randomness to ensure unique IDs
        type: "belongs_to",
        name: "",
        destination: "",
        modifiers: [],
    });

    async function addNewResource() {
        const newId = Date.now();
        resources = [
            ...resources,
            {
                id: newId,
                name: "",
                domain: "",
                attributes: [blankAttribute()], // ← one blank row
                relationships: [blankRelationship()], // ← one blank row
                defaultActions: ["create", "read", "update", "destroy"], // All checked by default
                idType: "uuid-v7",
                idFieldName: "id",
                extensions: ["postgres"], // Postgres checked by default
                customExtension: "",
                base: "",
                timestamps: true,
                ignoreIfExists: false,
                conflictHandling: "ignore",
                includeYesFlag: true,
            },
        ];
        activeResourceIndex = resources.length - 1;

        // Focus the Resource Name field of the newly created resource
        await tick();
        const input = document.getElementById(`resource-name-${newId}`);
        if (input) input.focus();
    }

    function deleteResource(index) {
        if (resources.length > 1) {
            resources = resources.filter((_, i) => i !== index);
            if (activeResourceIndex >= resources.length) {
                activeResourceIndex = resources.length - 1;
            }
        }
    }

    function maybeAppendBlankAttribute(resourceIndex, attrIndex) {
        const list = resources[resourceIndex].attributes;
        if (
            attrIndex === list.length - 1 &&
            list[attrIndex].name.trim() !== ""
        ) {
            resources[resourceIndex].attributes = [...list, blankAttribute()];
            resources = resources; // Force reactivity
        }
    }

    function maybeAppendBlankRelationship(resourceIndex, relIndex) {
        const list = resources[resourceIndex].relationships;
        if (relIndex === list.length - 1 && list[relIndex].name.trim() !== "") {
            resources[resourceIndex].relationships = [
                ...list,
                blankRelationship(),
            ];
            resources = resources; // Force reactivity
        }
    }

    async function addAttribute(resourceIndex) {
        const newId = Date.now();
        resources[resourceIndex].attributes = [
            ...resources[resourceIndex].attributes,
            {
                id: newId,
                name: "",
                type: "string",
                modifiers: [],
            },
        ];
        resources = resources; // Force reactivity
        await tick();
        const input = document.getElementById(`attr-name-${newId}`);
        if (input) input.focus();
    }

    function removeAttribute(resourceIndex, attrIndex) {
        resources[resourceIndex].attributes = resources[
            resourceIndex
        ].attributes.filter((_, i) => i !== attrIndex);
        resources = resources; // Force reactivity
    }

    async function addRelationship(resourceIndex) {
        const newId = Date.now();
        resources[resourceIndex].relationships = [
            ...resources[resourceIndex].relationships,
            {
                id: newId,
                type: "belongs_to",
                name: "",
                destination: "",
                modifiers: [],
            },
        ];
        resources = resources; // Force reactivity
        await tick();
        const input = document.getElementById(`rel-name-${newId}`);
        if (input) input.focus();
    }

    function removeRelationship(resourceIndex, relIndex) {
        resources[resourceIndex].relationships = resources[
            resourceIndex
        ].relationships.filter((_, i) => i !== relIndex);
        resources = resources; // Force reactivity
    }

    function handleAttributeDndConsider(resourceIndex, e) {
        resources[resourceIndex].attributes = e.detail.items;
        resources = resources; // Force reactivity
    }

    function handleAttributeDndFinalize(resourceIndex, e) {
        resources[resourceIndex].attributes = e.detail.items;
        resources = resources; // Force reactivity
    }

    function handleRelationshipDndConsider(resourceIndex, e) {
        resources[resourceIndex].relationships = e.detail.items;
        resources = resources; // Force reactivity
    }

    function handleRelationshipDndFinalize(resourceIndex, e) {
        resources[resourceIndex].relationships = e.detail.items;
        resources = resources; // Force reactivity
    }

    // Helper function to force reactivity on checkbox changes
    function forceUpdate() {
        resources = resources;
    }

    function generateCommand(resource) {
        if (!resource.name) return "";

        let cmd = `mix ash.gen.resource ${resource.name}`;

        // Add default actions
        if (resource.defaultActions.length > 0) {
            cmd += ` \\\n  --default-actions ${resource.defaultActions.join(",")}`;
        }

        // Add ID configuration
        if (resource.idType !== "none" && resource.idFieldName) {
            if (resource.idType === "uuid-v7") {
                cmd += ` \\\n  --uuid-v7-primary-key ${resource.idFieldName}`;
            } else if (resource.idType === "uuid") {
                cmd += ` \\\n  --uuid-primary-key ${resource.idFieldName}`;
            } else if (resource.idType === "integer") {
                cmd += ` \\\n  --integer-primary-key ${resource.idFieldName}`;
            }
        }

        // Add attributes
        resource.attributes.forEach((attr) => {
            if (attr.name && attr.type) {
                let attrDef = `${attr.name}:${attr.type}`;
                if (attr.modifiers.length > 0) {
                    attrDef += `:${attr.modifiers.join(":")}`;
                }
                cmd += ` \\\n  --attribute ${attrDef}`;
            }
        });

        // Add relationships
        resource.relationships.forEach((rel) => {
            if (rel.name && rel.destination) {
                let relDef = `${rel.type}:${rel.name}:${rel.destination}`;
                if (rel.modifiers.length > 0) {
                    relDef += `:${rel.modifiers.join(":")}`;
                }
                cmd += ` \\\n  --relationship ${relDef}`;
            }
        });

        // Add domain
        if (resource.domain) {
            cmd += ` \\\n  --domain ${resource.domain}`;
        }

        // Add extensions
        const allExtensions = [...resource.extensions];
        if (resource.customExtension) {
            allExtensions.push(resource.customExtension);
        }
        if (allExtensions.length > 0) {
            cmd += ` \\\n  --extend ${allExtensions.join(",")}`;
        }

        // Add base
        if (resource.base) {
            cmd += ` \\\n  --base ${resource.base}`;
        }

        // Add timestamps
        if (resource.timestamps) {
            cmd += ` \\\n  --timestamps`;
        }

        // Add ignore-if-exists
        if (resource.ignoreIfExists) {
            cmd += ` \\\n  --ignore-if-exists`;
        }

        // Add conflict handling
        if (resource.conflictHandling !== "ignore") {
            cmd += ` \\\n  --conflicts ${resource.conflictHandling}`;
        }

        // Add --yes flag
        if (resource.includeYesFlag) {
            cmd += ` \\\n  --yes`;
        }

        return cmd;
    }

    function copyCommand(command) {
        navigator.clipboard.writeText(command);
    }

    // 1. Produce the "first pass" command:
    function generateBaseCommand(resource) {
        // clone so we can blank out relationships without mutating state
        const copy = { ...resource, relationships: [] };
        return generateCommand(copy);
    }
    /* 2. Produce the "second pass" command that ONLY adds relationships
     *    (and --domain if supplied) */
    function generateRelationshipCommand(resource) {
        if (!resource.name) return "";
        // Build all valid relationship flag segments
        const relFlags = resource.relationships
            .filter(
                (rel) => rel.name && rel.destination, // skip incomplete rows
            )
            .map((rel) => {
                let relDef = `${rel.type}:${rel.name}:${rel.destination}`;
                if (rel.modifiers.length) {
                    relDef += `:${rel.modifiers.join(":")}`;
                }
                return `--relationship ${relDef}`;
            });
        if (relFlags.length === 0) return ""; // Nothing to do
        // Assemble the command; include --domain when present
        let cmd = `mix ash.gen.resource ${resource.name} \\\n  ${relFlags.join(
            " \\\n  ",
        )}`;
        if (resource.domain) {
            cmd += ` \\\n  --domain ${resource.domain}`;
        }
        // Add --yes flag for relationship commands
        if (resource.includeYesFlag) {
            cmd += ` \\\n  --yes`;
        }
        return cmd;
    }
    function downloadScript() {
        /* ---------------- First pass: NO relationships ---------------- */
        const firstPass = resources
            .map((r) => {
                const cmd = generateBaseCommand(r);
                return cmd ? `# Generate ${r.name}\n${cmd}\n` : "";
            })
            .filter(Boolean);
        /* ---------------- Second pass: ONLY relationships -------------- */
        const secondPass = resources
            .map((r) => {
                const cmd = generateRelationshipCommand(r);
                return cmd
                    ? `# Patch ${r.name} – add relationships\n${cmd}\n`
                    : "";
            })
            .filter(Boolean);
        /* Combine script parts */
        const script = [
            "#!/bin/bash",
            "",
            "# --------------------------------------------",
            "# Pass 1: create resources (no relationships)",
            "# --------------------------------------------",
            ...firstPass,
            "",
            "# --------------------------------------------",
            "# Pass 2: add relationships",
            "# --------------------------------------------",
            ...secondPass,
            "",
        ].join("\n");
        /* Trigger the download */
        const blob = new Blob([script], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "generate_ash_resources.sh";
        a.click();
        URL.revokeObjectURL(url);
    }

    function clearAll() {
        if (confirm("Clear all resources? This cannot be undone.")) {
            resources = [];
            addNewResource();
            localStorage.removeItem("ash-resource-generator");
        }
    }
</script>

<div class="min-h-screen bg-gray-50">
    <div class="container mx-auto p-4 max-w-7xl">
        <div class="bg-white rounded-lg shadow-lg p-6 mb-4">
            <div class="flex items-center justify-between">
                <div>
                    <h1 class="text-3xl font-bold text-gray-800 mb-2">
                        Ash Resource Generator
                    </h1>
                    <p class="text-gray-600">
                        Generate <a
                            href="https://hexdocs.pm/ash/Mix.Tasks.Ash.Gen.Resource.html"
                            class="text-blue-600 hover:text-blue-800 underline font-medium"
                            target="_blank"
                            rel="noopener noreferrer">mix ash.gen.resource</a
                        > commands
                    </p>
                </div>
                <a
                    href="https://github.com/albinkc/ashgen"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="text-gray-600 hover:text-gray-800 transition-colors"
                    title="View Source"
                    aria-label="Github"
                >
                    <svg
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                    >
                        <path
                            d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"
                        />
                    </svg>
                </a>
            </div>
        </div>

        <!-- Resource Tabs -->
        <div class="bg-white rounded-lg shadow-lg mb-4">
            <div class="border-b border-gray-200">
                <div class="flex items-center justify-between p-4">
                    <div class="flex space-x-1 overflow-x-auto">
                        {#each resources as resource, index}
                            <button
                                class="px-4 py-2 rounded-t-lg transition-colors {activeResourceIndex ===
                                index
                                    ? 'bg-blue-500 text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}"
                                on:click={() => (activeResourceIndex = index)}
                            >
                                {resource.name || `Resource ${index + 1}`}
                            </button>
                        {/each}
                    </div>
                    <div class="flex space-x-2 ml-4">
                        <button
                            class="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
                            on:click={addNewResource}
                        >
                            + Add Resource
                        </button>
                        <button
                            class="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                            on:click={() => deleteResource(activeResourceIndex)}
                            disabled={resources.length <= 1}
                        >
                            Delete
                        </button>
                    </div>
                </div>
            </div>

            {#if resources[activeResourceIndex]}
                <div class="p-6">
                    <!-- Basic Information -->
                    <div class="mb-6">
                        <h2 class="text-xl font-semibold mb-4">
                            Basic Information
                        </h2>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label
                                    for={"resource-name-" + resource.id}
                                    class="block text-sm font-medium text-gray-700 mb-1"
                                    >Resource Name</label
                                >
                                <input
                                    id={"resource-name-" + resource.id}
                                    type="text"
                                    bind:value={resource.name}
                                    on:input={forceUpdate}
                                    placeholder="e.g., MyApp.Blog.Post"
                                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label
                                    for="resource-domain"
                                    class="block text-sm font-medium text-gray-700 mb-1"
                                    >Domain</label
                                >
                                <input
                                    id="resource-domain"
                                    type="text"
                                    bind:value={resource.domain}
                                    on:input={forceUpdate}
                                    placeholder="e.g., MyApp.Blog"
                                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>
                    </div>

                    <!-- ID Configuration -->
                    <div class="mb-6">
                        <h2 class="text-xl font-semibold mb-4">
                            Primary Key Configuration
                        </h2>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label
                                    for="id-type"
                                    class="block text-sm font-medium text-gray-700 mb-1"
                                    >ID Type</label
                                >
                                <select
                                    id="id-type"
                                    bind:value={resource.idType}
                                    on:change={forceUpdate}
                                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    {#each idTypes as type}
                                        <option value={type}>{type}</option>
                                    {/each}
                                </select>
                            </div>
                            {#if resource.idType !== "none"}
                                <div>
                                    <label
                                        for="id-field-name"
                                        class="block text-sm font-medium text-gray-700 mb-1"
                                        >ID Field Name</label
                                    >
                                    <input
                                        id="id-field-name"
                                        type="text"
                                        bind:value={resource.idFieldName}
                                        on:input={forceUpdate}
                                        placeholder="e.g., id"
                                        class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            {/if}
                        </div>
                    </div>

                    <!-- Attributes -->
                    <div class="mb-6">
                        <div class="flex justify-between items-center mb-4">
                            <h2 class="text-xl font-semibold">Attributes</h2>
                            <button
                                class="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                                on:click={() =>
                                    addAttribute(activeResourceIndex)}
                            >
                                + Add Attribute
                            </button>
                        </div>
                        <div
                            use:dndzone={{
                                items: resource.attributes,
                                flipDurationMs: 300,
                                type: "attributes",
                            }}
                            on:consider={(e) =>
                                handleAttributeDndConsider(
                                    activeResourceIndex,
                                    e,
                                )}
                            on:finalize={(e) =>
                                handleAttributeDndFinalize(
                                    activeResourceIndex,
                                    e,
                                )}
                            class="space-y-2"
                        >
                            {#each resource.attributes as attr, attrIndex (attr.id)}
                                <div
                                    animate:flip={{ duration: 300 }}
                                    class="flex items-center space-x-2 p-3 bg-gray-50 rounded-md"
                                >
                                    <span class="cursor-move text-gray-400"
                                        >⋮⋮</span
                                    >
                                    <input
                                        id="attr-name-{attr.id}"
                                        type="text"
                                        bind:value={attr.name}
                                        placeholder="Name"
                                        on:input={() => {
                                            forceUpdate();
                                            maybeAppendBlankAttribute(
                                                activeResourceIndex,
                                                attrIndex,
                                            );
                                        }}
                                        class="flex-1 px-2 py-1 border border-gray-300 rounded"
                                    />
                                    <select
                                        bind:value={attr.type}
                                        on:change={forceUpdate}
                                        class="px-2 py-1 border border-gray-300 rounded"
                                    >
                                        {#each attributeTypes as type}
                                            <option value={type}>{type}</option>
                                        {/each}
                                    </select>
                                    <div class="flex space-x-2">
                                        {#each attributeModifiers as mod}
                                            <label class="flex items-center">
                                                <input
                                                    type="checkbox"
                                                    bind:group={attr.modifiers}
                                                    value={mod}
                                                    on:change={forceUpdate}
                                                    class="mr-1"
                                                />
                                                <span class="text-sm"
                                                    >{mod}</span
                                                >
                                            </label>
                                        {/each}
                                    </div>
                                    <button
                                        class="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                                        on:click={() =>
                                            removeAttribute(
                                                activeResourceIndex,
                                                attrIndex,
                                            )}
                                    >
                                        ×
                                    </button>
                                </div>
                            {/each}
                        </div>
                    </div>

                    <!-- Relationships -->
                    <div class="mb-6">
                        <div class="flex justify-between items-center mb-4">
                            <h2 class="text-xl font-semibold">Relationships</h2>
                            <button
                                class="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                                on:click={() =>
                                    addRelationship(activeResourceIndex)}
                            >
                                + Add Relationship
                            </button>
                        </div>
                        <div
                            class="space-y-2"
                            use:dndzone={{
                                items: resource.relationships,
                                flipDurationMs: 300,
                                type: "relationships",
                            }}
                            on:consider={(e) =>
                                handleRelationshipDndConsider(
                                    activeResourceIndex,
                                    e,
                                )}
                            on:finalize={(e) =>
                                handleRelationshipDndFinalize(
                                    activeResourceIndex,
                                    e,
                                )}
                        >
                            {#each resource.relationships as rel, relIndex (rel.id)}
                                <div
                                    animate:flip={{ duration: 300 }}
                                    class="flex items-center space-x-2 p-3 bg-gray-50 rounded-md"
                                >
                                    <span class="cursor-move text-gray-400"
                                        >⋮⋮</span
                                    >
                                    <select
                                        bind:value={rel.type}
                                        on:change={forceUpdate}
                                        class="px-2 py-1 border border-gray-300 rounded"
                                    >
                                        {#each relationshipTypes as type}
                                            <option value={type}>{type}</option>
                                        {/each}
                                    </select>
                                    <input
                                        id="rel-name-{rel.id}"
                                        type="text"
                                        bind:value={rel.name}
                                        placeholder="Name"
                                        on:input={() => {
                                            forceUpdate();
                                            maybeAppendBlankRelationship(
                                                activeResourceIndex,
                                                relIndex,
                                            );
                                        }}
                                        class="flex-1 px-2 py-1 border border-gray-300 rounded"
                                    />
                                    <input
                                        type="text"
                                        bind:value={rel.destination}
                                        placeholder="Destination (e.g., MyApp.Accounts.User)"
                                        on:input={forceUpdate}
                                        list="resource-names"
                                        class="flex-1 px-2 py-1 border border-gray-300 rounded"
                                    />
                                    <div class="flex space-x-2">
                                        {#each relationshipModifiers as mod}
                                            {#if rel.type === "belongs_to" || mod === "public"}
                                                <label
                                                    class="flex items-center"
                                                >
                                                    <input
                                                        type="checkbox"
                                                        bind:group={
                                                            rel.modifiers
                                                        }
                                                        value={mod}
                                                        on:change={forceUpdate}
                                                        class="mr-1"
                                                    />
                                                    <span class="text-sm"
                                                        >{mod}</span
                                                    >
                                                </label>
                                            {/if}
                                        {/each}
                                    </div>
                                    <button
                                        class="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                                        on:click={() =>
                                            removeRelationship(
                                                activeResourceIndex,
                                                relIndex,
                                            )}
                                    >
                                        ×
                                    </button>
                                </div>
                            {/each}
                        </div>
                    </div>

                    <!-- Options -->
                    <div class="mb-6">
                        <h2 class="text-xl font-semibold mb-4">Options</h2>
                        <div class="space-y-4">
                            <!-- Default Actions -->
                            <div>
                                <div class="flex items-center space-x-3 mb-1">
                                    <span
                                        class="text-sm font-medium text-gray-700"
                                        >Default Actions</span
                                    >
                                    <button
                                        type="button"
                                        class="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                                        on:click={() => {
                                            resource.defaultActions = [
                                                ...defaultActionTypes,
                                            ];
                                            forceUpdate();
                                        }}
                                    >
                                        Select All
                                    </button>
                                    <button
                                        type="button"
                                        class="px-2 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
                                        on:click={() => {
                                            resource.defaultActions = [];
                                            forceUpdate();
                                        }}
                                    >
                                        Select None
                                    </button>
                                </div>
                                <div class="flex space-x-4">
                                    {#each defaultActionTypes as action}
                                        <label class="flex items-center">
                                            <input
                                                type="checkbox"
                                                bind:group={
                                                    resource.defaultActions
                                                }
                                                value={action}
                                                on:change={forceUpdate}
                                                class="mr-2"
                                            />
                                            {action}
                                        </label>
                                    {/each}
                                </div>
                            </div>

                            <!-- Extensions -->
                            <div>
                                <span
                                    class="block text-sm font-medium text-gray-700 mb-1"
                                    >Extensions</span
                                >
                                <div class="flex space-x-4 mb-2">
                                    {#each builtinExtensions as ext}
                                        <label class="flex items-center">
                                            <input
                                                type="checkbox"
                                                bind:group={resource.extensions}
                                                value={ext}
                                                on:change={forceUpdate}
                                                class="mr-2"
                                            />
                                            {ext}
                                        </label>
                                    {/each}
                                </div>
                                <input
                                    id="custom-extension"
                                    type="text"
                                    bind:value={resource.customExtension}
                                    on:input={forceUpdate}
                                    placeholder="Custom extension (e.g., Some.Extension)"
                                    class="w-full px-3 py-2 border border-gray-300 rounded-md"
                                />
                            </div>

                            <!-- Base Module -->
                            <div>
                                <label
                                    for="base-module"
                                    class="block text-sm font-medium text-gray-700 mb-1"
                                    >Base Module</label
                                >
                                <input
                                    id="base-module"
                                    type="text"
                                    bind:value={resource.base}
                                    on:input={forceUpdate}
                                    placeholder="e.g., Ash.Resource"
                                    class="w-full px-3 py-2 border border-gray-300 rounded-md"
                                />
                            </div>

                            <!-- Checkboxes -->
                            <div class="flex space-x-6">
                                <label class="flex items-center">
                                    <input
                                        type="checkbox"
                                        bind:checked={resource.timestamps}
                                        on:change={forceUpdate}
                                        class="mr-2"
                                    />
                                    Timestamps
                                </label>
                                <label class="flex items-center">
                                    <input
                                        type="checkbox"
                                        bind:checked={resource.ignoreIfExists}
                                        on:change={forceUpdate}
                                        class="mr-2"
                                    />
                                    Ignore if exists
                                </label>
                                <label class="flex items-center">
                                    <input
                                        type="checkbox"
                                        bind:checked={resource.includeYesFlag}
                                        on:change={forceUpdate}
                                        class="mr-2"
                                    />
                                    Include --yes flag
                                </label>
                            </div>

                            <!-- Conflict Handling -->
                            <div>
                                <label
                                    for="conflict-handling"
                                    class="block text-sm font-medium text-gray-700 mb-1"
                                    >Conflict Handling</label
                                >
                                <select
                                    id="conflict-handling"
                                    bind:value={resource.conflictHandling}
                                    on:change={forceUpdate}
                                    class="px-3 py-2 border border-gray-300 rounded-md"
                                >
                                    <option value="ignore">ignore</option>
                                    <option value="replace">replace</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <!-- Generated Command -->
                    <div class="mb-6">
                        <div class="flex justify-between items-center mb-2">
                            <h2 class="text-xl font-semibold">
                                Generated Command
                            </h2>
                            <button
                                class="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
                                on:click={() => copyCommand(command)}
                            >
                                Copy
                            </button>
                        </div>
                        <pre
                            class="bg-gray-900 text-gray-100 p-4 rounded-md overflow-x-auto"><code
                                >{command ||
                                    "# Configure resource details above"}</code
                            ></pre>
                    </div>
                </div>
            {/if}
        </div>

        <!-- Actions -->
        <div
            class="bg-white rounded-lg shadow-lg p-4 flex justify-between items-center"
        >
            <button
                class="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
                on:click={clearAll}
            >
                Clear All
            </button>
            <button
                class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                on:click={downloadScript}
            >
                Download Script (.sh)
            </button>
        </div>
    </div>

    <!-- Datalist for resource name autocomplete -->
    <datalist id="resource-names">
        {#each resourceNames as name}
            <option value={name}></option>{name} />
        {/each}
    </datalist>
</div>

<style>
    :global(body) {
        margin: 0;
        font-family:
            -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen,
            Ubuntu, Cantarell, sans-serif;
    }
</style>
