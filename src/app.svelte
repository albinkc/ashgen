<script>
    import { onMount } from "svelte";
    import { flip } from "svelte/animate";
    import { dndzone } from "svelte-dnd-action";

    // Data types and modifiers based on Ash framework
    const attributeTypes = [
        "string",
        "integer",
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
    ];
    const relationshipTypes = [
        "belongs_to",
        "has_one",
        "has_many",
        "many_to_many",
    ];
    const relationshipModifiers = [
        "public",
        "required",
        "sensitive",
        "primary_key",
    ];
    const defaultActionTypes = ["create", "read", "update", "destroy"];
    const idTypes = ["uuid-v7", "uuid", "integer", "none"];
    const builtinExtensions = ["postgres", "graphql", "json_api"];

    let resources = [];
    let activeResourceIndex = 0;

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

    function addNewResource() {
        resources = [
            ...resources,
            {
                id: Date.now(),
                name: "",
                domain: "",
                attributes: [],
                relationships: [],
                defaultActions: [],
                idType: "uuid-v7",
                idFieldName: "id",
                extensions: [],
                customExtension: "",
                base: "",
                timestamps: true,
                ignoreIfExists: false,
                conflictHandling: "ignore",
            },
        ];
        activeResourceIndex = resources.length - 1;
    }

    function deleteResource(index) {
        if (resources.length > 1) {
            resources = resources.filter((_, i) => i !== index);
            if (activeResourceIndex >= resources.length) {
                activeResourceIndex = resources.length - 1;
            }
        }
    }

    function addAttribute(resourceIndex) {
        resources[resourceIndex].attributes = [
            ...resources[resourceIndex].attributes,
            {
                id: Date.now(),
                name: "",
                type: "string",
                modifiers: [],
            },
        ];
    }

    function removeAttribute(resourceIndex, attrIndex) {
        resources[resourceIndex].attributes = resources[
            resourceIndex
        ].attributes.filter((_, i) => i !== attrIndex);
    }

    function addRelationship(resourceIndex) {
        resources[resourceIndex].relationships = [
            ...resources[resourceIndex].relationships,
            {
                id: Date.now(),
                type: "belongs_to",
                name: "",
                destination: "",
                modifiers: [],
            },
        ];
    }

    function removeRelationship(resourceIndex, relIndex) {
        resources[resourceIndex].relationships = resources[
            resourceIndex
        ].relationships.filter((_, i) => i !== relIndex);
    }

    function handleAttributeDndConsider(resourceIndex, e) {
        resources[resourceIndex].attributes = e.detail.items;
    }

    function handleAttributeDndFinalize(resourceIndex, e) {
        resources[resourceIndex].attributes = e.detail.items;
    }

    function handleRelationshipDndConsider(resourceIndex, e) {
        resources[resourceIndex].relationships = e.detail.items;
    }

    function handleRelationshipDndFinalize(resourceIndex, e) {
        resources[resourceIndex].relationships = e.detail.items;
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

        return cmd;
    }

    function copyCommand(command) {
        navigator.clipboard.writeText(command);
    }

    function downloadScript() {
        const script = resources
            .map((resource) => {
                const cmd = generateCommand(resource);
                return cmd ? `# Generate ${resource.name}\n${cmd}\n` : "";
            })
            .filter((cmd) => cmd)
            .join("\n");

        const blob = new Blob([`#!/bin/bash\n\n${script}`], {
            type: "text/plain",
        });
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
            <h1 class="text-3xl font-bold text-gray-800 mb-2">
                Ash Resource Generator
            </h1>
            <p class="text-gray-600">
                Generate mix ash.gen.resource commands with an intuitive UI
            </p>
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
                {@const resource = resources[activeResourceIndex]}
                {@const command = generateCommand(resource)}

                <div class="p-6">
                    <!-- Basic Information -->
                    <div class="mb-6">
                        <h2 class="text-xl font-semibold mb-4">
                            Basic Information
                        </h2>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label
                                    class="block text-sm font-medium text-gray-700 mb-1"
                                    >Resource Name</label
                                >
                                <input
                                    type="text"
                                    bind:value={resource.name}
                                    placeholder="e.g., MyApp.Blog.Post"
                                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label
                                    class="block text-sm font-medium text-gray-700 mb-1"
                                    >Domain</label
                                >
                                <input
                                    type="text"
                                    bind:value={resource.domain}
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
                                    class="block text-sm font-medium text-gray-700 mb-1"
                                    >ID Type</label
                                >
                                <select
                                    bind:value={resource.idType}
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
                                        class="block text-sm font-medium text-gray-700 mb-1"
                                        >ID Field Name</label
                                    >
                                    <input
                                        type="text"
                                        bind:value={resource.idFieldName}
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
                                        type="text"
                                        bind:value={attr.name}
                                        placeholder="Name"
                                        class="flex-1 px-2 py-1 border border-gray-300 rounded"
                                    />
                                    <select
                                        bind:value={attr.type}
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
                                        class="px-2 py-1 border border-gray-300 rounded"
                                    >
                                        {#each relationshipTypes as type}
                                            <option value={type}>{type}</option>
                                        {/each}
                                    </select>
                                    <input
                                        type="text"
                                        bind:value={rel.name}
                                        placeholder="Name"
                                        class="flex-1 px-2 py-1 border border-gray-300 rounded"
                                    />
                                    <input
                                        type="text"
                                        bind:value={rel.destination}
                                        placeholder="Destination (e.g., MyApp.Accounts.User)"
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
                                <label
                                    class="block text-sm font-medium text-gray-700 mb-1"
                                    >Default Actions</label
                                >
                                <div class="flex space-x-4">
                                    {#each defaultActionTypes as action}
                                        <label class="flex items-center">
                                            <input
                                                type="checkbox"
                                                bind:group={
                                                    resource.defaultActions
                                                }
                                                value={action}
                                                class="mr-2"
                                            />
                                            {action}
                                        </label>
                                    {/each}
                                </div>
                            </div>

                            <!-- Extensions -->
                            <div>
                                <label
                                    class="block text-sm font-medium text-gray-700 mb-1"
                                    >Extensions</label
                                >
                                <div class="flex space-x-4 mb-2">
                                    {#each builtinExtensions as ext}
                                        <label class="flex items-center">
                                            <input
                                                type="checkbox"
                                                bind:group={resource.extensions}
                                                value={ext}
                                                class="mr-2"
                                            />
                                            {ext}
                                        </label>
                                    {/each}
                                </div>
                                <input
                                    type="text"
                                    bind:value={resource.customExtension}
                                    placeholder="Custom extension (e.g., Some.Extension)"
                                    class="w-full px-3 py-2 border border-gray-300 rounded-md"
                                />
                            </div>

                            <!-- Base Module -->
                            <div>
                                <label
                                    class="block text-sm font-medium text-gray-700 mb-1"
                                    >Base Module</label
                                >
                                <input
                                    type="text"
                                    bind:value={resource.base}
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
                                        class="mr-2"
                                    />
                                    Timestamps
                                </label>
                                <label class="flex items-center">
                                    <input
                                        type="checkbox"
                                        bind:checked={resource.ignoreIfExists}
                                        class="mr-2"
                                    />
                                    Ignore if exists
                                </label>
                            </div>

                            <!-- Conflict Handling -->
                            <div>
                                <label
                                    class="block text-sm font-medium text-gray-700 mb-1"
                                    >Conflict Handling</label
                                >
                                <select
                                    bind:value={resource.conflictHandling}
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
</div>

<style>
    :global(body) {
        margin: 0;
        font-family:
            -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen,
            Ubuntu, Cantarell, sans-serif;
    }
</style>
