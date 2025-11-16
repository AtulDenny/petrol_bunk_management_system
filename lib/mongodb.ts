import { MongoClient, Db, Collection, ServerApiVersion } from "mongodb";

let cachedClient: MongoClient | null = null;
let cachedDbs: Map<string, Db> = new Map();

function getMongoUri(): string {
	const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/petrol-pump-management";
	return uri;
}

async function getClient(): Promise<MongoClient> {
	if (cachedClient && cachedClient.topology && cachedClient.topology.isConnected()) {
		return cachedClient;
	}

	const client = new MongoClient(getMongoUri(), {
		// Required for Atlas stable API
		serverApi: {
			version: ServerApiVersion.v1,
			strict: true,
			deprecationErrors: true,
		},
		// Ensure TLS for SRV connections; allow insecure only if explicitly enabled for local debugging
		tls: true,
		tlsAllowInvalidCertificates: process.env.MONGODB_TLS_INSECURE === "true",
	});
	await client.connect();
	cachedClient = client;
	return client;
}

export async function getDb(dbName: string): Promise<Db> {
	if (cachedDbs.has(dbName)) {
		return cachedDbs.get(dbName)!;
	}
	const client = await getClient();
	const db = client.db(dbName);
	cachedDbs.set(dbName, db);
	return db;
}

export async function getCollection<TSchema = any>(dbName: string, collectionName: string): Promise<Collection<TSchema>> {
	const db = await getDb(dbName);
	return db.collection<TSchema>(collectionName);
}


