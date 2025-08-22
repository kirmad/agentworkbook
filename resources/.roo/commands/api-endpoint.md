---
description: Generate a new REST API endpoint with best practices
argument-hint: <endpoint-name> <http-method> [resource-type]
---

Create a new REST API endpoint with the following components:

## Endpoint Implementation
- RESTful URL structure following conventions
- Appropriate HTTP method handling (GET, POST, PUT, DELETE, PATCH)
- Proper HTTP status code responses
- Request/response payload validation

## Security & Authentication
- Authentication middleware integration
- Authorization checks based on user roles/permissions
- Input validation and sanitization
- Rate limiting considerations

## Error Handling
- Comprehensive error handling with meaningful messages
- Proper error response format (JSON API standard)
- Logging for debugging and monitoring
- Graceful handling of edge cases

## Documentation & Testing
- OpenAPI/Swagger documentation
- Unit tests for endpoint logic
- Integration tests for full request/response cycle
- Example requests and responses

## Additional Features
- Pagination for list endpoints
- Filtering and sorting capabilities
- Caching headers where appropriate
- CORS configuration if needed