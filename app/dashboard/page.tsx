'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  VStack,
  Heading,
  Text,
  Button,
  Flex,
  Avatar,
  Badge,
  Grid,
  Spinner,
} from '@chakra-ui/react';
import axios from 'axios';
import InfoCard from '../components/InfoCard';
import React from 'react';

interface User {
  id: string;
  email: string;
  name: string | null;
  role: string;
}

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Check if user is stored in localStorage
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    } else {
      // Redirect to login if no user found
      router.push('/login');
    }
    setLoading(false);
  }, [router]);

  const handleLogout = async () => {
    try {
      // Call logout API
      await axios.post('/api/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear local storage and redirect
      localStorage.removeItem('user');
      router.push('/login');
    }
  };

  const handleChangePassword = () => {
    router.push('/change-password');
  };

  if (loading) {
    return (
      <Flex
        minH="100vh"
        align="center"
        justify="center"
        bg="gray.50"
      >
        <VStack gap={4}>
          <Spinner size="xl" color="orange.500" />
          <Text fontSize="lg" color="gray.600">Loading...</Text>
        </VStack>
      </Flex>
    );
  }

  if (!user) {
    return null; // Will redirect to login
  }

  return (
      <React.Fragment>
          {/* Main content */}
          <Box py={6} px={{ base: 4, sm: 6, lg: 8 }}>
              <VStack gap={6} align="stretch">
                  <Box>
                      <Heading size="xl" color="gray.900" mb={2}>
                          Welcome to eBay Connector Dashboard
                      </Heading>
                      <Text color="gray.600">
                          Manage your authentication and account settings.
                      </Text>
                  </Box>

                  <Grid
                      templateColumns={{ base: "1fr", md: "repeat(2, 1fr)" }}
                      gap={6}
                  >
                      <InfoCard
                          title="Account Settings"
                          description="Manage your profile and security"
                          icon="⚙️"
                          iconBgColor="orange.100"
                          iconColor="orange.600"
                      >
                          <Button
                              onClick={handleChangePassword}
                              colorScheme="orange"
                              variant="outline"
                              w="full"
                          >
                              Change Password
                          </Button>
                      </InfoCard>

                      <InfoCard
                          title="User Information"
                          description="Your account details"
                          icon="👤"
                          iconBgColor="blue.100"
                          iconColor="blue.600"
                      >
                          <VStack gap={2} align="start">
                              <Text fontSize="sm" color="gray.600">
                                  Email: {user.email}
                              </Text>
                              <Text fontSize="sm" color="gray.600">
                                  Role: {user.role}
                              </Text>
                              {user.name && (
                                  <Text fontSize="sm" color="gray.600">
                                      Name: {user.name}
                                  </Text>
                              )}
                          </VStack>
                      </InfoCard>
                  </Grid>
              </VStack>
          </Box>
      </React.Fragment>
  );
}