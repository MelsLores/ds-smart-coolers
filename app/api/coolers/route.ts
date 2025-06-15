import { NextResponse } from 'next/server'
import { MongoClient, ServerApiVersion } from 'mongodb'

const uri = process.env['MONGODB_URI']
const dbName = 'smart-coolers' // corregido el nombre de la base de datos
const collectionName = 'data_sms'

const client = new MongoClient(uri!, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
})

export async function GET() {
  if (!uri) return NextResponse.json({ error: 'No MONGODB_URI' }, { status: 500 })
  try {
    await client.connect()
    const db = client.db(dbName)
    const coolers = await db.collection(collectionName).find({}).limit(100).toArray()
    return NextResponse.json(coolers)
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}

export async function POST(req: Request) {
  if (!uri) return NextResponse.json({ error: 'No MONGODB_URI' }, { status: 500 })
  try {
    const data = await req.json()
    await client.connect()
    const db = client.db(dbName)
    const result = await db.collection(collectionName).insertOne(data)
    return NextResponse.json({ insertedId: result.insertedId })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}
