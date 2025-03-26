import express from 'express';
import categoryController from '../controllers/category.controller';

const router = express.Router();
//Crud de categories
router.post('/',categoryController.createCategory);

router.post('/array', categoryController.insertCategories)

router.get('/', categoryController.getAllCategories);

router.get('/search', categoryController.searchCategories);

router.get('/:id', categoryController.getCategoryById);

router.put('/:id', categoryController.updateCategory);

router.delete('/:id', categoryController.deleteCategory);

export default router;