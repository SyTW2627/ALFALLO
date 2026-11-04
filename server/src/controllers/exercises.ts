import { Request, Response } from 'express';
import { Exercise } from '../models/exercises';

export const getExercises = async (req: Request, res: Response) => {
  try {
    const exercises = await Exercise.find().sort({ name: 1 });
    return res.status(200).json(exercises);
  } catch (error) {
    return res.status(500).json({ message: 'Error al obtener los ejercicios', error });
  }
};

export const createExercise = async (req: Request, res: Response) => {
  try {
    const { name, description, bodyPart, difficulty } = req.body;

    const existingExercise = await Exercise.findOne({ name });
    if (existingExercise) {
      return res.status(400).json({ message: 'Ya existe un ejercicio con ese nombre' });
    }

    const exercise = new Exercise({ name, description, bodyPart, difficulty });
    await exercise.save();

    return res.status(201).json(exercise);
  } catch (error: any) {
    return res.status(400).json({ message: error.message || 'Error al crear el ejercicio' });
  }
};