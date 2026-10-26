import { Router } from 'express';
import { getProfile, updateProfile, changePassword, deleteAccount } from '../controllers/users';
import { authenticateJWT } from '../middlewares/auth';

const router = Router();

// Todas estas rutas requieren estar autenticado
router.use(authenticateJWT);

router.get('/profile', getProfile); // /api/users/profile - Obtener perfil del usuario autenticado
router.put('/profile', updateProfile); // /api/users/profile - Actualizar datos básicos (nombre, email)
router.patch('/change-password', changePassword); // /api/users/change-password - Cambiar contraseña
router.delete('/account', deleteAccount); // /api/users/account - Eliminar cuenta propia

export default router;