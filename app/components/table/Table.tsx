"use client";

import {
    Box,
    VStack,
    HStack,
    Heading,
    Text,
    Button,
    IconButton,
    Alert,
    Spinner,
    Tooltip,
    Switch,
} from "@chakra-ui/react";
import { MdRefresh } from "react-icons/md";
import { HiCheck, HiX } from "react-icons/hi";
import { useDataTable } from "@/app/hooks/useDataTable";
import { FilterConfig } from "@/app/hooks/useFilters";
import { DataTable } from "./DataTable";
import { FilterBar } from "./FilterBar";
import { Pagination } from "./Pagination";
import { TableColumn } from "./DataTable";
import { forwardRef, useImperativeHandle, useState, useMemo } from "react";
import axios from "axios";
import DeleteConfirmDialog from "@/app/components/common/DeleteConfirmDialog";

export interface TableProps<T = any> {
    // Data configuration
    endpoint: string;
    columns: TableColumn<T>[];

    // Page configuration
    title?: string;
    description?: string;

    // Filter configuration
    filterConfigs?: FilterConfig[];
    showFilters?: boolean;

    // Pagination configuration
    showPagination?: boolean;
    initialPageSize?: number;
    pageSizeOptions?: number[];

    // Header actions
    headerActions?: React.ReactNode;
    showRefreshButton?: boolean;

    // Row actions
    actions?: TableAction<T>[];
    showActions?: boolean;

    // Styling
    className?: string;

    // Data table options
    initialParams?: Record<string, any>;
    autoFetch?: boolean;
}

export interface TableRef {
    refetch: () => Promise<void>;
}

// Action configuration interfaces
export interface TableAction<T = any> {
    key: string;
    label: string;
    icon?: React.ComponentType;
    type: "edit" | "delete" | "status" | "switch" | "custom";

    // For edit actions
    modalComponent?: React.ComponentType<any>;
    editEndpoint?: string; // PUT /api/items/{id}

    // For delete actions
    deleteEndpoint?: string; // DELETE /api/items/{id}
    itemNameField?: keyof T; // field to show in delete confirmation

    // For status actions
    statusEndpoint?: string; // PATCH /api/items/{id}/status
    statusField?: keyof T; // field that contains the status boolean
    activeLabel?: string; // "Active", "Enabled", etc.
    inactiveLabel?: string; // "Inactive", "Disabled", etc.

    // For custom actions
    onClick?: (item: T, refetch: () => Promise<void>) => void;

    // Common options
    variant?: "ghost" | "solid" | "outline";
    colorPalette?: string;
    visible?: (item: T) => boolean;
    disabled?: (item: T) => boolean;
}

export const Table = forwardRef<TableRef, TableProps<any>>(function Table<
    T = any
>(
    {
        endpoint,
        columns,
        title,
        description,
        filterConfigs = [],
        showFilters = true,
        showPagination = true,
        initialPageSize = 25,
        pageSizeOptions = [10, 25, 50, 100],
        headerActions,
        showRefreshButton = true,
        actions = [],
        showActions = true,
        className,
        initialParams,
        autoFetch = true,
    }: TableProps<T>,
    ref: React.Ref<TableRef>
) {
    // Action state management
    const [editItem, setEditItem] = useState<T | null>(null);
    const [deleteItem, setDeleteItem] = useState<T | null>(null);
    const [isActionLoading, setIsActionLoading] = useState(false);

    // Local optimistic updates state
    const [optimisticUpdates, setOptimisticUpdates] = useState<
        Map<string, Partial<T>>
    >(new Map());
    const [deletedItems, setDeletedItems] = useState<Set<string>>(new Set());

    // Use our data table hook
    const dataTable = useDataTable<T>({
        endpoint,
        filterConfigs,
        initialParams,
        autoFetch,
        pagination: {
            initialPageSize,
            pageSizeOptions,
        },
    });

    // Apply optimistic updates to the display data
    const optimisticDisplayData = useMemo(() => {
        if (!dataTable.displayData) return [];

        return dataTable.displayData
            .filter((item) => !deletedItems.has((item as any).id))
            .map((item) => {
                const itemId = (item as any).id;
                const updates = optimisticUpdates.get(itemId);
                return updates ? { ...item, ...updates } : item;
            });
    }, [dataTable.displayData, optimisticUpdates, deletedItems]);

    // Expose refetch function via ref
    useImperativeHandle(
        ref,
        () => ({
            refetch: dataTable.refetch,
        }),
        [dataTable.refetch]
    );

    // Action handlers
    const handleEdit = (item: T) => {
        // Get the item with any optimistic updates applied
        const itemId = (item as any).id;
        const updates = optimisticUpdates.get(itemId);
        const itemWithUpdates = updates ? { ...item, ...updates } : item;
        setEditItem(itemWithUpdates);
    };

    const handleDelete = (item: T) => {
        setDeleteItem(item);
    };

    const handleStatusToggle = async (item: T, action: TableAction<T>) => {
        if (!action.statusEndpoint || !action.statusField) return;

        const itemId = (item as any).id;
        const currentStatus = (item as any)[action.statusField];
        const newStatus = !currentStatus;

        // Apply optimistic update to local state
        setOptimisticUpdates((prev) =>
            new Map(prev).set(itemId, {
                ...prev.get(itemId),
                [action.statusField as string]: newStatus,
            })
        );

        try {
            // Make API call
            await axios.patch(action.statusEndpoint.replace("{id}", itemId), {
                [action.statusField as string]: newStatus,
            });

            // Update the cached data directly and clear optimistic update
            dataTable.mutate((currentData) =>
                currentData.map((item) =>
                    (item as any).id === itemId
                        ? { ...item, [action.statusField as string]: newStatus }
                        : item
                )
            );
            setOptimisticUpdates((prev) => {
                const next = new Map(prev);
                next.delete(itemId);
                return next;
            });
        } catch (error) {
            console.error("Failed to toggle status:", error);
            // Revert optimistic update on error
            setOptimisticUpdates((prev) => {
                const next = new Map(prev);
                next.delete(itemId);
                return next;
            });
        }
    };

    const handleDeleteConfirm = async () => {
        if (!deleteItem) return;

        const deleteAction = actions.find((a) => a.type === "delete");
        if (!deleteAction?.deleteEndpoint) return;

        const itemId = (deleteItem as any).id;

        // Apply optimistic delete to local state
        setDeletedItems((prev) => new Set(prev).add(itemId));
        setDeleteItem(null); // Close dialog immediately

        try {
            // Make API call
            await axios.delete(
                deleteAction.deleteEndpoint.replace("{id}", itemId)
            );

            // Remove item from cached data permanently
            dataTable.mutate((currentData) =>
                currentData.filter((item) => (item as any).id !== itemId)
            );
            // Remove from optimistic delete tracking since it's now permanently removed
            setDeletedItems((prev) => {
                const next = new Set(prev);
                next.delete(itemId);
                return next;
            });
        } catch (error) {
            console.error("Failed to delete item:", error);
            // Revert optimistic delete on error
            setDeletedItems((prev) => {
                const next = new Set(prev);
                next.delete(itemId);
                return next;
            });
        }
    };

    // Enhanced columns with actions
    const enhancedColumns: TableColumn<T>[] = [
        ...columns,
        ...(showActions && actions.length > 0
            ? [
                  {
                      key: "actions",
                      header: "Actions",
                      render: (item: T) => (
                          <HStack gap={1}>
                              {actions.map((action) => {
                                  // Check visibility and disabled conditions
                                  if (action.visible && !action.visible(item))
                                      return null;
                                  const isDisabled = action.disabled
                                      ? action.disabled(item)
                                      : false;

                                  let buttonProps: any = {
                                      "aria-label": action.label,
                                      size: "sm",
                                      variant: action.variant || "ghost",
                                      disabled: isDisabled,
                                  };

                                  if (action.colorPalette) {
                                      buttonProps.colorPalette =
                                          action.colorPalette;
                                  }

                                  // Handle different action types
                                  switch (action.type) {
                                      case "edit":
                                          return (
                                              <Tooltip.Root key={action.key}>
                                                  <Tooltip.Trigger asChild>
                                                      <IconButton
                                                          {...buttonProps}
                                                          onClick={() =>
                                                              handleEdit(item)
                                                          }
                                                      >
                                                          {action.icon ? (
                                                              <action.icon />
                                                          ) : (
                                                              "Edit"
                                                          )}
                                                      </IconButton>
                                                  </Tooltip.Trigger>
                                                  <Tooltip.Positioner>
                                                      <Tooltip.Content>
                                                          {action.label}
                                                      </Tooltip.Content>
                                                  </Tooltip.Positioner>
                                              </Tooltip.Root>
                                          );

                                      case "delete":
                                          return (
                                              <Tooltip.Root key={action.key}>
                                                  <Tooltip.Trigger asChild>
                                                      <IconButton
                                                          {...buttonProps}
                                                          onClick={() =>
                                                              handleDelete(item)
                                                          }
                                                      >
                                                          {action.icon ? (
                                                              <action.icon />
                                                          ) : (
                                                              "Delete"
                                                          )}
                                                      </IconButton>
                                                  </Tooltip.Trigger>
                                                  <Tooltip.Positioner>
                                                      <Tooltip.Content>
                                                          {action.label}
                                                      </Tooltip.Content>
                                                  </Tooltip.Positioner>
                                              </Tooltip.Root>
                                          );

                                      case "status":
                                          const currentStatus =
                                              action.statusField
                                                  ? (item as any)[
                                                        action.statusField
                                                    ]
                                                  : false;
                                          const statusLabel = currentStatus
                                              ? action.inactiveLabel ||
                                                "Deactivate"
                                              : action.activeLabel ||
                                                "Activate";
                                          return (
                                              <Tooltip.Root key={action.key}>
                                                  <Tooltip.Trigger asChild>
                                                      <IconButton
                                                          {...buttonProps}
                                                          aria-label={statusLabel}
                                                          onClick={() =>
                                                              handleStatusToggle(
                                                                  item,
                                                                  action
                                                              )
                                                          }
                                                      >
                                                          {action.icon ? (
                                                              <action.icon />
                                                          ) : currentStatus ? (
                                                              "Pause"
                                                          ) : (
                                                              "Play"
                                                          )}
                                                      </IconButton>
                                                  </Tooltip.Trigger>
                                                  <Tooltip.Positioner>
                                                      <Tooltip.Content>
                                                          {statusLabel}
                                                      </Tooltip.Content>
                                                  </Tooltip.Positioner>
                                              </Tooltip.Root>
                                          );

                                      case "switch":
                                          const switchStatus =
                                              action.statusField
                                                  ? (item as any)[
                                                        action.statusField
                                                    ]
                                                  : false;
                                          const switchId = `switch-${action.key}-${(item as any).id}`;
                                          return (
                                              <Tooltip.Root key={action.key} positioning={{ placement: "top" }}>
                                                  <Tooltip.Trigger asChild>
                                                      <Box>
                                                          <Switch.Root
                                                              checked={switchStatus}
                                                              onCheckedChange={() =>
                                                                  handleStatusToggle(
                                                                      item,
                                                                      action
                                                                  )
                                                              }
                                                              disabled={isDisabled}
                                                              size="sm"
                                                              ids={{ root: switchId }}
                                                              colorPalette="green"
                                                          >
                                                              <Switch.HiddenInput />
                                                              <Switch.Control>
                                                                  <Switch.Thumb>
                                                                      <Switch.ThumbIndicator fallback={<HiX color="black" />}>
                                                                          <HiCheck color="white" />
                                                                      </Switch.ThumbIndicator>
                                                                  </Switch.Thumb>
                                                              </Switch.Control>
                                                          </Switch.Root>
                                                      </Box>
                                                  </Tooltip.Trigger>
                                                  <Tooltip.Positioner>
                                                      <Tooltip.Content>
                                                          {switchStatus
                                                              ? action.activeLabel || "Activate"
                                                              : action.inactiveLabel || "Deactivate"}
                                                      </Tooltip.Content>
                                                  </Tooltip.Positioner>
                                              </Tooltip.Root>
                                          );

                                      case "custom":
                                          return (
                                              <Tooltip.Root key={action.key}>
                                                  <Tooltip.Trigger asChild>
                                                      <IconButton
                                                          {...buttonProps}
                                                          onClick={() =>
                                                              action.onClick?.(
                                                                  item,
                                                                  dataTable.refetch
                                                              )
                                                          }
                                                      >
                                                          {action.icon ? (
                                                              <action.icon />
                                                          ) : (
                                                              action.label
                                                          )}
                                                      </IconButton>
                                                  </Tooltip.Trigger>
                                                  <Tooltip.Positioner>
                                                      <Tooltip.Content>
                                                          {action.label}
                                                      </Tooltip.Content>
                                                  </Tooltip.Positioner>
                                              </Tooltip.Root>
                                          );

                                      default:
                                          return null;
                                  }
                              })}
                          </HStack>
                      ),
                  },
              ]
            : []),
    ];

    return (
        <Box className={className}>
            <VStack gap={6} align="stretch">
                {/* Header */}
                {(title ||
                    description ||
                    headerActions ||
                    showRefreshButton) && (
                    <HStack justify="space-between" align="flex-start">
                        {(title || description) && (
                            <Box>
                                {title && (
                                    <Heading size="xl" mb={2}>
                                        {title}
                                    </Heading>
                                )}
                                {description && (
                                    <Text color="gray.600">{description}</Text>
                                )}
                            </Box>
                        )}

                        <HStack gap={3}>
                            {showRefreshButton && (
                                <Tooltip.Root>
                                    <Tooltip.Trigger asChild>
                                        <IconButton
                                            aria-label="Refresh"
                                            variant="ghost"
                                            onClick={() => dataTable.refetch()}
                                        >
                                            <MdRefresh />
                                        </IconButton>
                                    </Tooltip.Trigger>
                                    <Tooltip.Positioner>
                                        <Tooltip.Content>
                                            Refresh data
                                        </Tooltip.Content>
                                    </Tooltip.Positioner>
                                </Tooltip.Root>
                            )}
                            {headerActions}
                        </HStack>
                    </HStack>
                )}

                {/* Error Alert */}
                {dataTable.error && (
                    <Alert.Root status="error">
                        <Alert.Indicator />
                        <Alert.Content>
                            <Alert.Title>Error!</Alert.Title>
                            <Alert.Description>
                                {dataTable.error}
                            </Alert.Description>
                        </Alert.Content>
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => dataTable.refetch()}
                        >
                            Retry
                        </Button>
                    </Alert.Root>
                )}

                {/* Filters */}
                {showFilters && filterConfigs.length > 0 && (
                    <FilterBar
                        filters={dataTable.filters}
                        filterConfigs={filterConfigs}
                        onFilterChange={dataTable.setFilter}
                        onClearFilter={dataTable.clearFilter}
                        onClearAllFilters={dataTable.clearAllFilters}
                        hasActiveFilters={dataTable.hasActiveFilters}
                    />
                )}

                {/* Data Table */}
                <DataTable
                    data={optimisticDisplayData}
                    columns={enhancedColumns}
                    loading={dataTable.loading}
                    error={dataTable.error}
                    onRefresh={() => dataTable.refetch()}
                    sortConfig={dataTable.sortConfig}
                    onSort={dataTable.toggleSorting}
                />

                {/* Pagination */}
                {showPagination && (
                    <Pagination
                        pagination={dataTable.pagination}
                        onPageChange={dataTable.goToPage}
                        onPageSizeChange={dataTable.setPageSize}
                        pageSizeOptions={pageSizeOptions}
                        showPageSizeSelector={true}
                        showPageInfo={true}
                        showNavButtons={true}
                    />
                )}

                {/* Table Stats */}
                {dataTable.stats.totalItems > 0 && (
                    <Box>
                        <Text fontSize="sm" color="gray.600" textAlign="center">
                            Showing {dataTable.stats.displayedItems} of{" "}
                            {dataTable.stats.filteredItems} filtered results (
                            {dataTable.stats.totalItems} total items)
                        </Text>
                    </Box>
                )}

                {/* Built-in Delete Confirmation Dialog */}
                {deleteItem && (
                    <DeleteConfirmDialog
                        isOpen={!!deleteItem}
                        onClose={() => setDeleteItem(null)}
                        onConfirm={handleDeleteConfirm}
                        itemName={(() => {
                            const deleteAction = actions.find(
                                (a) => a.type === "delete"
                            );
                            if (deleteAction?.itemNameField) {
                                return String(
                                    (deleteItem as any)[
                                        deleteAction.itemNameField
                                    ]
                                );
                            }
                            return "this item";
                        })()}
                        itemType="item"
                        isDeleting={false}
                    />
                )}

                {/* Built-in Edit Modal */}
                {editItem &&
                    (() => {
                        const editAction = actions.find(
                            (a) => a.type === "edit"
                        );
                        if (editAction?.modalComponent) {
                            const ModalComponent = editAction.modalComponent;
                            return (
                                <ModalComponent
                                    isOpen={!!editItem}
                                    onClose={() => setEditItem(null)}
                                    token={editItem}
                                    onSubmit={async (data: any) => {
                                        if (editAction.editEndpoint) {
                                            const itemId = (editItem as any).id;

                                            // Apply optimistic update to local state
                                            setOptimisticUpdates((prev) =>
                                                new Map(prev).set(itemId, {
                                                    ...prev.get(itemId),
                                                    ...data,
                                                })
                                            );
                                            setEditItem(null); // Close modal immediately

                                            try {
                                                // Make API call
                                                await axios.put(
                                                    editAction.editEndpoint.replace(
                                                        "{id}",
                                                        itemId
                                                    ),
                                                    data
                                                );

                                                // Update the cached data directly and clear optimistic update
                                                dataTable.mutate((currentData) =>
                                                    currentData.map((item) =>
                                                        (item as any).id === itemId
                                                            ? { ...item, ...data }
                                                            : item
                                                    )
                                                );
                                                setOptimisticUpdates((prev) => {
                                                    const next = new Map(prev);
                                                    next.delete(itemId);
                                                    return next;
                                                });
                                            } catch (error) {
                                                console.error(
                                                    "Failed to update item:",
                                                    error
                                                );
                                                // Revert optimistic update on error
                                                setOptimisticUpdates((prev) => {
                                                    const next = new Map(prev);
                                                    next.delete(itemId);
                                                    return next;
                                                });
                                            }
                                        }
                                    }}
                                    isSubmitting={false} // Never show loading since we use optimistic updates
                                />
                            );
                        }
                        return null;
                    })()}
            </VStack>
        </Box>
    );
});

export default Table;
