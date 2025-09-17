import {
  Box,
  Flex,
  Text,
  HStack,
  VStack,
} from '@chakra-ui/react';

export default function Footer() {
  return (
    <Box bg="gray.50" borderTop="1px" borderColor="gray.200" mt="auto">
      <Box maxW="7xl" mx="auto" px={{ base: 4, sm: 6, lg: 8 }} py={8}>
        <VStack gap={6}>
          <Box h="1px" bg="gray.300" w="full" />

          <Flex
            direction={{ base: 'column', md: 'row' }}
            justify="between"
            align="center"
            w="full"
            gap={4}
          >
            <Text fontSize="sm" color="gray.600">
              © 2024 eBay Connector. All rights reserved.
            </Text>
            <Text fontSize="sm" color="gray.500">
              Developed by - SFX E-commerce
            </Text>
          </Flex>
        </VStack>
      </Box>
    </Box>
  );
}