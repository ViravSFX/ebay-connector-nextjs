'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  VStack,
  HStack,
  Heading,
  Text,
  Button,
  Table,
  Badge,
  IconButton,
  Alert,
  Spinner,
  Flex,
  Input,
  Field,
  Card,
} from '@chakra-ui/react';
import {
  MdAdd,
  MdEdit,
  MdDelete,
  MdRefresh,
  MdSearch,
} from 'react-icons/md';
import axios from 'axios';
import UserModal from '@/app/components/modals/UserModal';
import RoleSelect from '@/app/components/common/RoleSelect';
import DeleteConfirmDialog from '@/app/components/common/DeleteConfirmDialog';

interface User {
  id: string;
  email: string;
  name: string | null;
  role: string;
  createdAt: string;
}

interface UserFormData {
  email: string;
  name: string;
  role: string;
  password?: string;
}


export default function UsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    // Check if user is logged in
    const user = localStorage.getItem('user');
    if (!user) {
      router.push('/login');
      return;
    }

    fetchUsers();
    loadCurrentUser();
  }, [router]);

  const loadCurrentUser = () => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setCurrentUser(JSON.parse(storedUser));
    }
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/users');
      if (response.data.success) {
        setUsers(response.data.data);
      } else {
        setError(response.data.message || 'Failed to fetch users');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const handleUserSubmit = async (formData: UserFormData) => {
    try {
      setSubmitting(true);

      if (editingUser) {
        // Update existing user
        const response = await axios.put(`/api/users/${editingUser.id}`, formData);
        if (response.data.success) {
          setUsers(users.map(user =>
            user.id === editingUser.id ? response.data.data : user
          ));
          handleModalClose();
        } else {
          setError(response.data.message || 'Failed to update user');
        }
      } else {
        // Create new user
        const response = await axios.post('/api/users', formData);
        if (response.data.success) {
          setUsers([response.data.data, ...users]);
          handleModalClose();
        } else {
          setError(response.data.message || 'Failed to create user');
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save user');
    } finally {
      setSubmitting(false);
    }
  };

  const openDeleteDialog = (user: User) => {
    setUserToDelete(user);
    setIsDeleteDialogOpen(true);
  };

  const closeDeleteDialog = () => {
    setIsDeleteDialogOpen(false);
    setUserToDelete(null);
    setIsDeleting(false);
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;

    try {
      setIsDeleting(true);
      const response = await axios.delete(`/api/users/${userToDelete.id}`);
      if (response.data.success) {
        setUsers(users.filter(u => u.id !== userToDelete.id));
        closeDeleteDialog();
      } else {
        setError(response.data.message || 'Failed to delete user');
        setIsDeleting(false);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete user');
      setIsDeleting(false);
    }
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingUser(null);
  };

  const openCreateModal = () => {
    setEditingUser(null);
    setIsModalOpen(true);
  };

  const openEditModal = (user: User) => {
    setEditingUser(user);
    setIsModalOpen(true);
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return 'red';
      case 'ADMIN':
        return 'orange';
      default:
        return 'blue';
    }
  };

  // Access control functions
  const canCreateUser = () => {
    return currentUser?.role === 'SUPER_ADMIN';
  };

  const canEditUser = (user: User) => {
    if (!currentUser) return false;

    // Users can't edit anyone
    if (currentUser.role === 'USER') return false;

    // Can't edit yourself
    if (currentUser.id === user.id) return false;

    // Super Admin can edit anyone except themselves
    if (currentUser.role === 'SUPER_ADMIN') return true;

    // Admin can't edit Super Admin or themselves
    if (currentUser.role === 'ADMIN') {
      return user.role !== 'SUPER_ADMIN';
    }

    return false;
  };

  const canDeleteUser = (user: User) => {
    if (!currentUser) return false;

    // Users can't delete anyone
    if (currentUser.role === 'USER') return false;

    // Can't delete yourself
    if (currentUser.id === user.id) return false;

    // Super Admin can delete anyone except themselves
    if (currentUser.role === 'SUPER_ADMIN') return true;

    // Admin can't delete Super Admin or themselves
    if (currentUser.role === 'ADMIN') {
      return user.role !== 'SUPER_ADMIN';
    }

    return false;
  };

  const filteredUsers = users.filter(user => {
    // Search filter
    const matchesSearch =
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.role.toLowerCase().includes(searchTerm.toLowerCase());

    // Role filter
    const matchesRole = roleFilter === 'ALL' || user.role === roleFilter;

    return matchesSearch && matchesRole;
  });

  if (loading) {
    return (
      <Flex minH="400px" align="center" justify="center">
        <VStack gap={4}>
          <Spinner size="xl" colorPalette="blue" />
          <Text>Loading users...</Text>
        </VStack>
      </Flex>
    );
  }

  return (
    <Box p={8}>
      <VStack gap={6} align="stretch">
        {/* Header */}
        <HStack justify="space-between" align="center">
          <VStack align="start" gap={1}>
            <Heading size="xl" color="gray.800">User Management</Heading>
            <Text color="gray.600">Manage system users and their permissions</Text>
          </VStack>
          <HStack gap={3}>
            <IconButton
              aria-label="Refresh"
              variant="ghost"
              onClick={fetchUsers}
            >
              <MdRefresh />
            </IconButton>
            {canCreateUser() && (
              <Button
                colorPalette="orange"
                onClick={openCreateModal}
              >
                <MdAdd style={{ marginRight: '8px' }} />
                Add User
              </Button>
            )}
          </HStack>
        </HStack>

        {/* Error Alert */}
        {error && (
          <Alert.Root status="error" borderRadius="md">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Description>{error}</Alert.Description>
            </Alert.Content>
            <IconButton
              aria-label="Close"
              size="sm"
              variant="ghost"
              position="absolute"
              top={2}
              right={2}
              onClick={() => setError('')}
            >
              ×
            </IconButton>
          </Alert.Root>
        )}

        {/* Search and Stats */}
        <Card.Root>
          <Card.Body p={6}>
            <HStack justify="space-between" align="center">
              <HStack gap={4}>
                <Box position="relative">
                  <Input
                    placeholder="Search users..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    pl={10}
                    w="300px"
                  />
                  <Box position="absolute" left={3} top="50%" transform="translateY(-50%)">
                    <MdSearch color="gray.400" />
                  </Box>
                </Box>
                <RoleSelect
                  value={roleFilter}
                  onChange={setRoleFilter}
                  placeholder="Filter by role..."
                  includeAllOption={true}
                  width="200px"
                />
              </HStack>
              <Text color="gray.600" fontSize="sm">
                {filteredUsers.length} of {users.length} users
              </Text>
            </HStack>
          </Card.Body>
        </Card.Root>

        {/* Users Table */}
        <Card.Root>
          <Table.Root variant="outline">
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeader>User</Table.ColumnHeader>
                <Table.ColumnHeader>Role</Table.ColumnHeader>
                <Table.ColumnHeader>Created</Table.ColumnHeader>
                <Table.ColumnHeader w="120px">Actions</Table.ColumnHeader>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {filteredUsers.map((user) => (
                <Table.Row key={user.id}>
                  <Table.Cell>
                    <VStack align="start" gap={1}>
                      <Text fontWeight="medium" color="gray.900">
                        {user.name || 'Unnamed User'}
                      </Text>
                      <Text fontSize="sm" color="gray.600">
                        {user.email}
                      </Text>
                    </VStack>
                  </Table.Cell>
                  <Table.Cell>
                    <Badge colorPalette={getRoleBadgeColor(user.role)} size="sm">
                      {user.role.replace('_', ' ')}
                    </Badge>
                  </Table.Cell>
                  <Table.Cell>
                    <Text fontSize="sm" color="gray.600">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </Text>
                  </Table.Cell>
                  <Table.Cell>
                    <HStack gap={1}>
                      {canEditUser(user) && (
                        <IconButton
                          aria-label="Edit user"
                          size="sm"
                          variant="ghost"
                          onClick={() => openEditModal(user)}
                        >
                          <MdEdit />
                        </IconButton>
                      )}
                      {canDeleteUser(user) && (
                        <IconButton
                          aria-label="Delete user"
                          size="sm"
                          variant="ghost"
                          colorPalette="red"
                          onClick={() => openDeleteDialog(user)}
                        >
                          <MdDelete />
                        </IconButton>
                      )}
                      {!canEditUser(user) && !canDeleteUser(user) && (
                        <Text fontSize="sm" color="gray.400">
                          No actions
                        </Text>
                      )}
                    </HStack>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>

          {filteredUsers.length === 0 && (
            <Box p={8} textAlign="center">
              <Text color="gray.500">
                {searchTerm ? 'No users found matching your search.' : 'No users found.'}
              </Text>
            </Box>
          )}
        </Card.Root>

        {/* User Modal */}
        <UserModal
          isOpen={isModalOpen}
          onClose={handleModalClose}
          onSubmit={handleUserSubmit}
          user={editingUser}
          isSubmitting={submitting}
          currentUserRole={currentUser?.role || 'USER'}
        />

        {/* Delete Confirmation Dialog */}
        <DeleteConfirmDialog
          isOpen={isDeleteDialogOpen}
          onClose={closeDeleteDialog}
          onConfirm={handleDeleteUser}
          itemName={userToDelete?.name || userToDelete?.email || ''}
          itemType="user"
          isDeleting={isDeleting}
        />
      </VStack>
    </Box>
  );
}