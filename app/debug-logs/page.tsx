"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from 'next/navigation';
import {
    Box,
    VStack,
    HStack,
    Text,
    Button,
    Badge,
    Input,
    Alert,
    Spinner,
    Container,
    Flex,
    Separator,
} from "@chakra-ui/react";

interface DebugLog {
    id: string;
    timestamp: string;
    level: "DEBUG" | "INFO" | "WARN" | "ERROR";
    category: string;
    message: string;
    metadata?: any;
    method?: string;
    url?: string;
    statusCode?: number;
    duration?: number;
    userAgent?: string;
    ip?: string;
    createdAt: string;
}

export default function DebugLogsPage() {
    const router = useRouter();
    const [logs, setLogs] = useState<DebugLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [autoRefresh, setAutoRefresh] = useState(true);
    const [filter, setFilter] = useState({
        level: "",
        category: "",
        search: "",
    });
    const [autoScroll, setAutoScroll] = useState(true);
    const [selectedLogIndex, setSelectedLogIndex] = useState<number | null>(null);
    const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());
    const logsEndRef = useRef<HTMLDivElement>(null);

    // Fetch logs from API
    const fetchLogs = async () => {
        try {
            const response = await fetch("/api/debug/logs?limit=200");
            const result = await response.json();

            if (result.success) {
                setLogs(result.data.logs);
                setError(null);
            } else {
                setError(result.message);
            }
        } catch (err) {
            setError("Failed to fetch logs");
            console.error("Error fetching logs:", err);
        } finally {
            setLoading(false);
        }
    };

    // Clear all logs
    const clearLogs = async () => {
        try {
            const response = await fetch("/api/debug/logs", {
                method: "DELETE",
            });
            const result = await response.json();

            if (result.success) {
                setLogs([]);
                setError(null);
            } else {
                setError(result.message);
            }
        } catch (err) {
            setError("Failed to clear logs");
            console.error("Error clearing logs:", err);
        }
    };

    useEffect(() => {
        // Check if user is logged in
        const user = localStorage.getItem('user');
        if (!user) {
            router.push('/login');
        }
    }, [router]);

    // Real-time SSE connection
    useEffect(() => {
        if (!autoRefresh) return;

        console.log("Connecting to SSE stream...");
        const eventSource = new EventSource("/api/debug/stream");

        eventSource.onopen = () => {
            setError(null);
            setLoading(false);
        };

        eventSource.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);

                if (data.type === "init") {
                    // Initial load of existing logs
                    setLogs(data.logs || []);
                } else if (data.type === "newLog") {
                    // New log added - append to existing logs
                    setLogs((prev) => [...prev, data.log]);
                } else if (data.type === "logsCleared") {
                    // All logs cleared
                    setLogs([]);
                }
                // Ignore heartbeat messages
            } catch (error) {
                console.error("Error parsing SSE data:", error);
            }
        };

        eventSource.onerror = (error) => {
            console.error("SSE error:", error);
            setError("Connection lost. Trying to reconnect...");
            eventSource.close();

            // Try to reconnect after 3 seconds
            setTimeout(() => {
                if (autoRefresh) {
                    // This will trigger a re-run of the useEffect
                    setError(null);
                }
            }, 3000);
        };

        return () => {
            console.log("Closing SSE connection");
            eventSource.close();
        };
    }, [autoRefresh]);

    // Initial load when auto-refresh is disabled
    useEffect(() => {
        if (!autoRefresh) {
            fetchLogs();
        }
    }, [autoRefresh]);

    // Auto-scroll to bottom when new logs are added
    useEffect(() => {
        if (autoScroll && logsEndRef.current) {
            logsEndRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [logs, autoScroll]);

    // Filter logs
    const filteredLogs = logs.filter((log) => {
        if (filter.level && log.level !== filter.level) return false;
        if (
            filter.category &&
            !log.category.toLowerCase().includes(filter.category.toLowerCase())
        )
            return false;
        if (filter.search) {
            const searchTerm = filter.search.toLowerCase();
            return (
                log.message.toLowerCase().includes(searchTerm) ||
                log.url?.toLowerCase().includes(searchTerm) ||
                log.method?.toLowerCase().includes(searchTerm)
            );
        }
        return true;
    });


    // Format timestamp in console style
    const formatTimestamp = (timestamp: string) => {
        const date = new Date(timestamp);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        const milliseconds = String(date.getMilliseconds()).padStart(3, '0');
        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds},${milliseconds}`;
    };

    // Get level number for console-style display
    const getLevelNumber = (level: string) => {
        switch (level) {
            case "ERROR": return "1";
            case "WARN": return "2";
            case "INFO": return "4";
            case "DEBUG": return "8";
            default: return "4";
        }
    };

    // Format log line in console style
    const formatLogLine = (log: DebugLog) => {
        const timestamp = formatTimestamp(log.timestamp);
        const levelNum = getLevelNumber(log.level);
        const level = log.level.toUpperCase();
        return `${timestamp} ${levelNum} ${level} ? ${log.category}: ${log.message}`;
    };

    // Get level colors for console display
    const getLevelTextColor = (level: string) => {
        switch (level) {
            case "ERROR": return "#ff6b6b";
            case "WARN": return "#ffd43b";
            case "INFO": return "#51cf66";
            case "DEBUG": return "#74c0fc";
            default: return "#adb5bd";
        }
    };

    // Get background color for selected/hover states
    const getLevelBackground = (level: string, isSelected: boolean) => {
        if (isSelected) {
            return "#4b4a4a";
        }
        switch (level) {
            case "ERROR": return "rgba(255, 107, 107, 0.1)";
            case "WARN": return "rgba(255, 212, 59, 0.1)";
            default: return "transparent";
        }
    };

    // Download logs as JSON
    const downloadLogs = () => {
        const dataStr = JSON.stringify(filteredLogs, null, 2);
        const dataBlob = new Blob([dataStr], { type: "application/json" });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `debug-logs-${
            new Date().toISOString().split("T")[0]
        }.json`;
        link.click();
        URL.revokeObjectURL(url);
    };

    // Toggle expand/collapse for a specific log
    const toggleLogExpansion = (logId: string) => {
        setExpandedLogs(prev => {
            const newSet = new Set(prev);
            if (newSet.has(logId)) {
                newSet.delete(logId);
            } else {
                newSet.add(logId);
            }
            return newSet;
        });
    };

    // Get unique categories for filter badges
    const uniqueCategories = [...new Set(logs.map(log => log.category))];

    return (
        <Container maxW="full" p={4}>
            <VStack gap={4} align="stretch" h="100vh">
                {/* Header */}
                <Flex justify="space-between" align="center">
                    <Text fontSize="2xl" fontWeight="bold">
                        🔍 Debug Console
                    </Text>
                    <Badge colorPalette="blue" size="lg">
                        {filteredLogs.length} logs
                    </Badge>
                </Flex>

                {/* Controls */}
                <HStack gap={4} wrap="wrap">
                    <Button
                        size="sm"
                        onClick={clearLogs}
                        colorPalette="red"
                        variant="outline"
                        disabled={logs.length === 0}
                    >
                        Clear Logs
                    </Button>

                    <Button
                        size="sm"
                        onClick={() => setAutoRefresh(!autoRefresh)}
                        colorPalette={autoRefresh ? "green" : "orange"}
                        variant="outline"
                    >
                        {autoRefresh ? "Real-time ON" : "Real-time OFF"}
                    </Button>

                    <Button
                        size="sm"
                        onClick={downloadLogs}
                        colorPalette="blue"
                        variant="outline"
                        disabled={filteredLogs.length === 0}
                    >
                        Export
                    </Button>

                    <Button
                        size="sm"
                        onClick={() => setAutoScroll(!autoScroll)}
                        colorPalette={autoScroll ? "blue" : "gray"}
                        variant="outline"
                    >
                        Auto-scroll: {autoScroll ? "On" : "Off"}
                    </Button>

                    <Button
                        size="sm"
                        onClick={fetchLogs}
                        disabled={loading}
                        variant="outline"
                    >
                        {loading ? <Spinner size="sm" /> : "Refresh"}
                    </Button>
                </HStack>

                {/* Filters */}
                <HStack gap={4}>
                    <Box>
                        <Text fontSize="sm" mb={2}>Search Messages</Text>
                        <Input
                            placeholder="Filter logs by message or category..."
                            value={filter.search}
                            onChange={(e) =>
                                setFilter((prev) => ({
                                    ...prev,
                                    search: e.target.value,
                                }))
                            }
                            size="sm"
                            width="300px"
                        />
                    </Box>

                    <Box>
                        <Text fontSize="sm" mb={2}>Category</Text>
                        <Input
                            placeholder="Filter by category (API, AUTH, etc.)"
                            value={filter.category}
                            onChange={(e) =>
                                setFilter((prev) => ({
                                    ...prev,
                                    category: e.target.value,
                                }))
                            }
                            size="sm"
                            width="200px"
                        />
                    </Box>

                    <Box>
                        <Text fontSize="sm" mb={2}>Level</Text>
                        <select
                            value={filter.level}
                            onChange={(e) =>
                                setFilter((prev) => ({
                                    ...prev,
                                    level: e.target.value,
                                }))
                            }
                            style={{
                                width: "120px",
                                padding: "8px 12px",
                                borderRadius: "6px",
                                border: "1px solid #d1d5db",
                                fontSize: "14px",
                                backgroundColor: "white",
                            }}
                        >
                            <option value="">All levels</option>
                            <option value="ERROR">ERROR</option>
                            <option value="WARN">WARN</option>
                            <option value="INFO">INFO</option>
                            <option value="DEBUG">DEBUG</option>
                        </select>
                    </Box>
                </HStack>

                {/* Category badges */}
                <HStack gap={2} wrap="wrap">
                    <Text fontSize="sm" color="gray.600">Categories:</Text>
                    {uniqueCategories.map(cat => (
                        <Badge
                            key={cat}
                            size="sm"
                            colorPalette={filter.category === cat ? "blue" : "gray"}
                            cursor="pointer"
                            onClick={() => setFilter(prev => ({ ...prev, category: filter.category === cat ? "" : cat }))}
                        >
                            {cat}
                        </Badge>
                    ))}
                </HStack>

                <Separator />

                {/* Error Message */}
                {error && (
                    <Alert.Root status="error">
                        <Alert.Indicator />
                        <Alert.Content>
                            <Alert.Description>{error}</Alert.Description>
                        </Alert.Content>
                    </Alert.Root>
                )}

                {/* Instructions */}
                <Alert.Root status="info">
                    <Alert.Indicator />
                    <Alert.Content>
                        <Alert.Description>
                            To capture API calls in debug logs, add{" "}
                            <code>?debug=1</code> to any API endpoint URL.
                            Example: <code>/api/ebay/check-scopes?debug=1</code>
                            {autoRefresh &&
                                " • Real-time mode: New logs appear instantly when added to database."}
                        </Alert.Description>
                    </Alert.Content>
                </Alert.Root>

                {/* Console Logs */}
                <Box
                    flex={1}
                    overflowY="auto"
                    bg="black"
                    color="white"
                    p={4}
                    borderRadius="md"
                    fontFamily="mono"
                    fontSize="sm"
                    maxH="60vh"
                >
                    <VStack gap={1} align="stretch">
                        {loading && logs.length === 0 ? (
                            <Text color="gray.400" textAlign="center" py={8}>
                                <Spinner size="sm" /> Loading logs...
                            </Text>
                        ) : filteredLogs.length === 0 ? (
                            <Text color="gray.400" textAlign="center" py={8}>
                                {logs.length === 0
                                    ? "No logs yet. Make some API calls with ?debug=1 to see logs here!"
                                    : "No logs match your filters."}
                            </Text>
                        ) : (
                            filteredLogs.map((log, index) => {
                                const isSelected = selectedLogIndex === index;
                                const isExpanded = expandedLogs.has(log.id);
                                const hasMetadata = log.metadata && Object.keys(log.metadata).length > 0;

                                return (
                                    <Box
                                        key={log.id}
                                        py={0.5}
                                        px={2}
                                        bg={getLevelBackground(log.level, isSelected)}
                                        borderRadius="sm"
                                        _hover={{
                                            bg: isSelected ? "#4b4a4a" : "#2d2d2d"
                                        }}
                                    >
                                        <HStack
                                            gap={2}
                                            align="start"
                                            cursor="pointer"
                                            onClick={() => setSelectedLogIndex(isSelected ? null : index)}
                                        >
                                            {/* Expand/Collapse Icon */}
                                            {hasMetadata && (
                                                <Text
                                                    fontSize="xs"
                                                    color="gray.400"
                                                    cursor="pointer"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        toggleLogExpansion(log.id);
                                                    }}
                                                    _hover={{ color: "white" }}
                                                    userSelect="none"
                                                    width="12px"
                                                    textAlign="center"
                                                >
                                                    {isExpanded ? "−" : "+"}
                                                </Text>
                                            )}
                                            {!hasMetadata && (
                                                <Box width="12px" />
                                            )}

                                            {/* Log Line */}
                                            <Text
                                                fontFamily="mono"
                                                fontSize="xs"
                                                color={getLevelTextColor(log.level)}
                                                whiteSpace="pre-wrap"
                                                lineHeight="1.2"
                                                userSelect="text"
                                                flex={1}
                                            >
                                                {formatLogLine(log)}
                                            </Text>
                                        </HStack>

                                        {/* Expanded Metadata */}
                                        {hasMetadata && isExpanded && (
                                            <Box
                                                pl={6}
                                                pt={1}
                                                borderLeft="1px solid"
                                                borderLeftColor="gray.600"
                                                ml={2}
                                            >
                                                <Text
                                                    fontFamily="mono"
                                                    fontSize="xs"
                                                    color="gray.400"
                                                    whiteSpace="pre-wrap"
                                                    userSelect="text"
                                                    lineHeight="1.3"
                                                >
                                                    {typeof log.metadata === "object"
                                                        ? JSON.stringify(log.metadata, null, 2)
                                                        : log.metadata
                                                    }
                                                </Text>
                                            </Box>
                                        )}
                                    </Box>
                                );
                            })
                        )}
                        <div ref={logsEndRef} />
                    </VStack>
                </Box>

                {/* Status */}
                <HStack justify="space-between">
                    <HStack gap={4}>
                        <Badge colorPalette="green">
                            🟢 Connected
                        </Badge>
                        {!autoRefresh && (
                            <Badge colorPalette="orange">
                                ⏸️ Real-time Paused
                            </Badge>
                        )}
                    </HStack>

                    <Text fontSize="xs" color="gray.500">
                        Last updated: {logs.length > 0 ? new Date(logs[logs.length - 1]?.timestamp).toLocaleTimeString() : "Never"}
                    </Text>
                </HStack>
            </VStack>
        </Container>
    );
}
