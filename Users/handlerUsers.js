const AWS = require('aws-sdk')
const dynamoDb = new AWS.DynamoDB.DocumentClient()
const { v4: uuidv4 } = require('uuid')

const params = {
  TableName: "users-amigospetshop"
}

exports.createUser = async (event) => {
  try {
    const timestamp = new Date().getTime()
    const data = JSON.parse(event.body)

    const { name, email, password } = data

    const localParams = {
      ...params,
      Item: {
        id: uuidv4(),
        name: name,
        email: email,
        password: password,
        createdAt: timestamp,
        updateOn: timestamp,
      },
    }

    await dynamoDb.put(localParams).promise()

    return {
      statusCode: 201,
      body: JSON.stringify({
        message: 'Usuário criado com sucesso!',
      }),
    }
  } catch (err) {
    console.error('Error during DynamoDB operation:', err)
    return {
      statusCode: err.statusCode ? err.statusCode : 500,
      body: JSON.stringify({
        error: err.name ? err.name : 'Exception',
        message: err.message ? err.message : 'Unknown error',
      }),
    }
  }
}

module.exports.listUsers = async (event) => {
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

module.exports.listUser = async (event) => {
  try {
    const { user_id } = event.pathParameters
    const data = await dynamoDb
      .get({
        ...params,
        Key: {
          id: user_id
        }
      })

    if (!data.Item) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: "Usuário não existe!" })
      }
    }

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

module.exports.updateUser = async (event) => {
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

exports.deleteUser = async (event) => {
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

exports.loginUser = async (event) => {
  try {
    const { email, password } = JSON.parse(event.body)

    const localParams = {
      ...params,
      FilterExpression: "email = :email AND password = :password",
      ExpressionAttributeValues: {
        ":email": email,
        ":password": password,
      },
    }

    const result = await dynamoDb.scan(localParams).promise()

    if (result.Items.length === 0) {
      return {
        statusCode: 401,
        body: JSON.stringify({ message: "Email ou senha inválidos." }),
      }
    }

    const user = result.Items[0]

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Login bem-sucedido!",
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
      }),
    }
  } catch (err) {
    console.error("Erro no login:", err)
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Erro interno no servidor." }),
    }
  }
}
