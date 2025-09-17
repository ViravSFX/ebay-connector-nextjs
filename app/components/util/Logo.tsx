'use client';

import React from "react";
import { Box, Flex, Icon, IconButton, Text } from "@chakra-ui/react";
import { AiFillThunderbolt, AiOutlineSearch } from "react-icons/ai";


export const Logo = () => (
  <Flex
    w="full"
    alignItems="center"
    justifyContent="space-between"
    flexDirection="row"
    gap={4}
  >
    <Box display="flex" alignItems="center" gap={2}>
      <Icon as={AiFillThunderbolt} fontSize={30} />
        <Text fontWeight="bold" fontSize={16}>
          eBay Connector
        </Text>
    </Box>
    <IconButton
      variant="ghost"
      aria-label="search"
      fontSize={26}
      color="gray.400"
      borderRadius="50%"
    >
      <AiOutlineSearch />
    </IconButton>
  </Flex>
);