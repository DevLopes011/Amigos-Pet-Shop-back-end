const AWS = require('aws-sdk');
const dynamoDb = new AWS.DynamoDB.DocumentClient();
const { v4: uuidv4 } = require('uuid')

const params = {
  TableName: "perguntas-amigospetshop"
}

exports.createMessage = async (event) => {
  try {
    const timestamp = new Date().getTime()

    const data = JSON.parse(event.body)

    const {
      name,
      email,
      phoneNumber,
      message
    } = data

    const localParams = {
      ...params,
      Item: {
        id: uuidv4(),
        name: name,
        email: email,
        phoneNumber: phoneNumber,
        message: message,
        createdAt: timestamp,
        updateOn: timestamp
      }
    }

    await dynamoDb
      .put(localParams)
      .promise()

    return {
      statusCode: 201,
      body: JSON.stringify({
        message: "Usuário criado com sucesso!"
      })
    }

  } catch (err) {
    console.log("Error", err)
    return {
      statusCode: err.statusCode ? err.statusCode : 500,
      body: JSON.stringify({
        error: err.name ? err.name : "Exception",
        message: err.message ? err.message : "Unknown error"
      })
    }
  }
}

module.exports.listMessages = async (event) => {
  try {
    const queryString = {
      limit: 5,
      ...event.queryStringParameters,
    }

    const limit = parseInt(queryString.limit, 10)
    const next = queryString.next

    let localParams = {
      ...params,
      limit: limit
    }

    if (next) {
      localParams.ExclusiveStarKey = {
        id: next,
      }
    }

    let data = await dynamoDb.scan(localParams).promise()

    let nextToken = data.LastEvaluatedKey ? data.LastEvaluatedKey.id : null

    const result = {
      items: data.Items,
      next_Token: nextToken
    }

    return {
      statusCode: 200,
      body: JSON.stringify(result)
    }
  } catch (err) {
    console.log("Error", err)
    return {
      statusCode: err.statusCode || 500,
      body: JSON.stringify({
        error: err.name || "Exception",
        message: err.message || "Unknown error"
      })
    }
  }
}

module.exports.listMessage = async (event) => {
  try {
    const { question_id } = event.pathParameters
    const data = await dynamoDb
      .get({
        ...params,
        Key: {
          id: question_id
        }
      })

    if (!data.Item) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: "Paciente não existe1" })
      }
    }

    const message = data.Item

    return {
      statusCode: 200,
      body: JSON.stringify(paciente)
    }
  } catch (err) {
    console.log("Error", err)
    return {
      statusCode: err.statusCode ? err.statusCode : 500,
      body: JSON.stringify({
        error: err.name ? err.name : "Exception",
        message: err.message ? err.message : "Unknown error"
      })
    }
  }
}

module.exports.updateMessage = async (event) => {
  const { id } = event.pathParameters
  try {
    const timestamp = new Date().getTime()
    let data = JSON.parse(event.body)

    const {
      name,
      email,
      phoneNumber,
      message
    } = data

    await dynamoDb
      .update({
        ...params,
        Key: {
          id: id
        },
        UpdateExpression:
          'SET name = :name, email = :email, phoneNumber = :phoneNumber, message = :message, updateOn = :updateOn',
        ConditionExpression: 'attribute_exists(id)',
        ExpressionAttributeValues: {
          ':name': name,
          'email': email,
          'phoneNumber': phoneNumber,
          'message': message,
          'updateOn': timestamp
        }
      })
      .promise

    return {
      statusCode: 204
    }
  } catch (err) {
    console.log("Error", err)
    let error = err.name ? err.name : "Exception"
    let message = err.message ? err.message : "Unknown error"
    let statusCode = err.statusCode ? err.statusCode : 500

    if (error = 'ConditionalCheckFailedException') {
      error = 'Paciente não existe'
      message = `Recurso com o ID ${pacienteId} não existe e não pode ser atualizado`
      statusCode = 404
    }
    return {
      statusCode,
      body: JSON.stringify({
        error,
        message
      })
    }
  }
}

exports.deleteMessage = async (event) => {
  const { id } = event.pathParameters

  try {
    await dynamoDb
      .delete({
        ...params,
        Key: {
          id: id
        },
        ConditionExpression: 'attribute_exists(id)'
      })
      .promise()
    return {
      statusCode: 204
    }
  } catch (err) {
    console.log("error", err)

    let error = err.name ? err.name : "Exception"
    let message = err.message ? err.message : "Unknown error"
    let statusCode = err.statusCode ? err.statusCode : 500

    if (error == 'ConditionalCheckFailedException') {
      error = 'Mensagem não Existe'
      message = `Recurso com o ID ${id} não existe e não pode ser Deletado`
      statusCode = 404
    }
    return {
      statusCode,
      body: JSON.stringify({
        error,
        message
      })
    }
  }
}