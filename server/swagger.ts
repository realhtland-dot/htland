export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Realty Messenger CRM API',
    version: '1.0.0',
    description:
      'REST API & Meta Webhook cho hệ thống quản lý tin nhắn Facebook Messenger đa Fanpage và CRM khách hàng bất động sản.',
  },
  servers: [
    {
      url: '/api',
      description: 'API Server (Port 3000)',
    },
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
  },
  paths: {
    '/health': {
      get: {
        summary: 'Kiểm tra trạng thái hệ thống',
        tags: ['System'],
        responses: {
          '200': { description: 'Hệ thống đang hoạt động bình thường' },
        },
      },
    },
    '/facebook/config-status': {
      get: {
        summary: 'Kiểm tra trạng thái cấu hình Meta App & Webhook URL',
        tags: ['Facebook'],
        security: [{ BearerAuth: [] }],
        responses: { '200': { description: 'Thông tin cấu hình OAuth & Webhook' } },
      },
    },
    '/facebook/oauth': {
      get: {
        summary: 'Tạo URL đăng nhập Facebook OAuth',
        tags: ['Facebook'],
        security: [{ BearerAuth: [] }],
        responses: { '200': { description: 'Trả về authorization URL' } },
      },
    },
    '/facebook/pages/{pageId}/subscribe': {
      post: {
        summary: 'Đăng ký Webhook cho Fanpage Facebook',
        tags: ['Facebook'],
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'pageId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Đăng ký thành công' } },
      },
    },
    '/facebook/pages/{pageId}/send': {
      post: {
        summary: 'Gửi tin nhắn Messenger qua Meta Graph API',
        tags: ['Conversations'],
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'pageId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Gửi thành công' } },
      },
    },
    '/webhooks/meta': {
      get: {
        summary: 'Xác minh Webhook từ Meta (Hub Challenge)',
        tags: ['Webhooks'],
        responses: { '200': { description: 'Trả về hub.challenge' } },
      },
      post: {
        summary: 'Tiếp nhận sự kiện tin nhắn Messenger từ Meta',
        tags: ['Webhooks'],
        responses: { '200': { description: 'EVENT_RECEIVED' } },
      },
    },
    '/ai/analyze': {
      post: {
        summary: 'Phân tích nhu cầu bất động sản từ nội dung hội thoại bằng AI',
        tags: ['AI'],
        security: [{ BearerAuth: [] }],
        responses: { '200': { description: 'Kết quả JSON chuẩn hóa' } },
      },
    },
    '/phones/extract': {
      post: {
        summary: 'Nhận diện và chuẩn hóa số điện thoại Việt Nam từ văn bản',
        tags: ['AI'],
        security: [{ BearerAuth: [] }],
        responses: { '200': { description: 'Danh sách số điện thoại đã chuẩn hóa' } },
      },
    },
  },
};
