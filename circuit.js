/**
 * Simple Circuit Graph Engine
 * Resolves paths from Power (Hot) to Load to Neutral.
 */

export class Circuit {
    constructor() {
        this.nodes = new Map(); // id -> node ({ type, connections: [] })
        this.wires = []; // list of { startId, endId, color }
    }

    addTerminal(id, type) {
        this.nodes.set(id, { type, connections: [] });
    }

    connect(id1, id2, color) {
        if (!this.nodes.has(id1) || !this.nodes.has(id2)) return;
        this.nodes.get(id1).connections.push({ to: id2, color });
        this.nodes.get(id2).connections.push({ to: id1, color });
        this.wires.push({ startId: id1, endId: id2, color });
    }

    reset() {
        this.wires = [];
        for (const node of this.nodes.values()) {
            node.connections = [];
        }
    }

    /**
     * Finds if there is a valid path from Source to Sink.
     * @param {string} sourceId 
     * @param {string} sinkId 
     * @param {Set<string>} switchedOffNodes - Nodes that are currently open (switches)
     */
    hasPath(sourceId, sinkId, switchedOffNodes = new Set()) {
        const visited = new Set();
        const queue = [sourceId];

        while (queue.length > 0) {
            const current = queue.shift();
            if (current === sinkId) return true;
            if (visited.has(current) || switchedOffNodes.has(current)) continue;

            visited.add(current);
            const node = this.nodes.get(current);
            if (node) {
                for (const edge of node.connections) {
                    queue.push(edge.to);
                }
            }
        }
        return false;
    }

    /**
     * Conducts a full analysis of the circuit to provide educational feedback.
     */
    analyzeCircuit(hotId, neutralId, loadInputId, loadOutputId, openSwitches = new Set(), loadNodes = new Set()) {
        const feedback = {
            isPowered: false,
            hasNeutral: false,
            isShort: false,
            message: "No power detected.",
            severity: "info"
        };

        // 1. Check for Short Circuit (Path from Hot to Neutral bypassing load)
        const visitedShort = new Set();
        const queueShort = [hotId];
        let shortDetected = false;

        while (queueShort.length > 0) {
            const current = queueShort.shift();
            if (current === neutralId) {
                shortDetected = true;
                break;
            }
            if (visitedShort.has(current) || openSwitches.has(current) || loadNodes.has(current)) continue;
            visitedShort.add(current);
            const node = this.nodes.get(current);
            if (node) {
                for (const edge of node.connections) queueShort.push(edge.to);
            }
        }

        if (shortDetected) {
            return { isPowered: false, isShort: true, message: "⚠️ DANGER: SHORT CIRCUIT! Hot connected directly to Neutral.", severity: "danger" };
        }

        // 2. Check path from Hot to Load
        const hasPathToLoad = this.hasPath(hotId, loadInputId, openSwitches);

        // 3. Check path from Load to Neutral
        const hasPathToNeutral = this.hasPath(loadOutputId, neutralId, openSwitches);

        if (hasPathToLoad && hasPathToNeutral) {
            return { isPowered: true, isShort: false, message: "✅ CIRCUIT COMPLETE: Light is ON!", severity: "success" };
        }

        if (hasPathToLoad && !hasPathToNeutral) {
            return { isPowered: false, isShort: false, message: "Missing path back to Neutral. The light has power but no return path.", severity: "warning" };
        }

        if (!hasPathToLoad && hasPathToNeutral) {
            return { isPowered: false, isShort: false, message: "Neutral is connected, but the Hot (power) path is broken or switched off.", severity: "info" };
        }

        return { isPowered: false, isShort: false, message: "Circuit is incomplete. Connect Hot to terminal, then to light, then to Neutral.", severity: "info" };
    }
}
