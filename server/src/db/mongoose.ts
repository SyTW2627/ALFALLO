import mongoose from 'mongoose';


export const connectDB = async (): Promise<void> => {
  try {
    const mongoURI = process.env.MONGODB_URL;


    if (!mongoURI) {
      throw new Error('La variable de entorno MONGODB_URL no está definida.');
    }


    await mongoose.connect(mongoURI);
    console.log('Conexión a MongoDB establecida con éxito.');
  } catch (error) {
    console.error('Error al conectar con MongoDB:', error);
    process.exit(1);
  }
};
