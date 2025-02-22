const express = require('express');
const { graphqlHTTP } = require('express-graphql');
const app = express();
const port = 5000;

const {
    GraphQLSchema,
    GraphQLObjectType,
    GraphQLString,
    GraphQLList,
    GraphQLInt,
    GraphQLNonNull
} = require('graphql');

const RootQueryType = new GraphQLObjectType({
    name: 'Query',
    description: 'Root Query',
    fields: () => ({
        // TODO
    })
});

const schema = new GraphQLSchema({
    query: RootQueryType
});

app.use(
    '/graphql',
    graphqlHTTP({
        schema: schema,
        graphiql: true
    })
);

app.listen(port, () => console.log('Server running'));
