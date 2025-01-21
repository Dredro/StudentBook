const swaggerJSDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

// Konfiguracja Swaggera
const swaggerOptions = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Social App API',
            version: '1.0.0',
            description: 'API for a social app where users can create posts, comment, like, and follow each other.',
        },
        servers: [
            {
                url: 'http://localhost:5000',
                description: 'Local server',
            },
        ],
    },
    apis: ['./routes/*.js'],
};

const swaggerSpec = swaggerJSDoc(swaggerOptions);

const setupSwagger = (app) => {
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
};

module.exports = setupSwagger;
