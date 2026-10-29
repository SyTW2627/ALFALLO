import { Document, Schema, Types, model } from "mongoose";
import { IExercise } from "./exercises";
import { IUser } from "./user";

enum objective {
  HYPERTROPHY = "hypertrophy",
  FORCE = "force",
  RESISTANCE = "resistance",
}

interface Range {
  min: number,
  max: number,
  default: number,
}

interface ObjectProfile {
  reps: Range;
  sessions: Range;
  restInSeconds: Range;
}

const profiles: Record<objective, ObjectProfile> = {

  [objective.FORCE]: {
    reps: {
      min: 4, 
      max: 8, 
      default: 6,
    },
    sessions: {
      min: 3,
      max: 6,
      default: 4,
    },
    restInSeconds: {
      min: 180,
      max: 300,
      default: 240,
    }
  },
  [objective.HYPERTROPHY]: {
    reps: {
      min: 8, 
      max: 12,
      default: 8,
    },
    sessions: {
      min: 3,
      max: 4,
      default: 3,
    },
    restInSeconds: {
      min: 90,
      max: 180,
      default: 150,
    }
  },
  [objective.RESISTANCE]: {
    reps: {
      min: 15, 
      max: 30, 
      default: 20,
    },
    sessions: {
      min: 2,
      max: 4,
      default: 3,
    },
    restInSeconds: {
      min: 30,
      max: 60,
      default: 45,
    }
  },

}


interface dailyRoutine {
  dailyExercises: IExercise[],
  workObjective: objective,
  reps: number,
  sessions: number,
  restInSeconds: number,
}

export interface Iroutine extends Document {
  userEmail: string,
  numberDays: number,
  completeRoutine: dailyRoutine[],
}

const dailySchema = new Schema<dailyRoutine>({
  dailyExercises: [{
    type: Schema.Types.ObjectId,
    ref: 'Exercise',
    required: true,
  }],
  workObjective: {
    type: String,
    enum: Object.values(objective),
    required: true,
  },
  reps: {
    type: Number,
    validate: function (this: dailyRoutine, value: number) {
      const workout = profiles[this.workObjective];
      
      const {min, max} = workout.sessions;
      return value >= min && value <= max;
    }
  },
  sessions: {
    type: Number,
    validate: function (this: dailyRoutine, value: number) {
      const workout = profiles[this.workObjective];
      
      const {min, max} = workout.sessions;
      return value >= min && value <= max;
    }
  },
  restInSeconds: {
    type: Number,
    validate: function (this: dailyRoutine, value: number) {
      const workout = profiles[this.workObjective];
      
      const {min, max} = workout.sessions;
      return value >= min && value <= max;
    }
  }
})


const routineSchema = new Schema<Iroutine>({
  userEmail: {
    type: String,
    validate: function (this: IUser, value: string){
      const validEmail = Object.values(this.email);
      if(!validEmail.includes(value)){
        throw new Error('Correo no válido');
      }
    },
    trim: true,
    lowercase: true,
    required: true,
    match: [/^\S+@\S+\.\S+$/, "Por favor, introduce un email válido"],
  },
  numberDays: {
    type: Number, 
    required: true,
  },
  completeRoutine: {
    type: [dailySchema],
    required: true,
    validate: function(){

    },
    default: [],
  }
})