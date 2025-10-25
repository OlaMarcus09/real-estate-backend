import express from 'express';
import { loadDB } from '../config/database.js';

const router = express.Router();

// GET comprehensive dashboard analytics
router.get('/dashboard', (req, res) => {
  try {
    const data = loadDB();
    
    const projects = data.projects || [];
    const workers = data.workers || [];
    const vendors = data.vendors || [];
    const expenses = data.expenses || [];
    const projectWorkers = data.project_workers || [];

    // Calculate project statistics
    const projectStats = {
      total: projects.length,
      byStatus: projects.reduce((acc, project) => {
        acc[project.status] = (acc[project.status] || 0) + 1;
        return acc;
      }, {}),
      totalBudget: projects.reduce((sum, project) => sum + (project.budget || 0), 0),
      totalSpent: projects.reduce((sum, project) => sum + (project.spent || 0), 0),
      averageBudget: projects.length > 0 ? projects.reduce((sum, project) => sum + (project.budget || 0), 0) / projects.length : 0,
      averageProgress: projects.length > 0 ? projects.reduce((sum, project) => sum + (project.progress_percent || 0), 0) / projects.length : 0
    };

    // Calculate worker statistics
    const workerStats = {
      total: workers.length,
      byRole: workers.reduce((acc, worker) => {
        acc[worker.role] = (acc[worker.role] || 0) + 1;
        return acc;
      }, {}),
      totalHourlyRate: workers.reduce((sum, worker) => sum + (worker.hourly_rate || 0), 0),
      averageHourlyRate: workers.length > 0 ? workers.reduce((sum, worker) => sum + (worker.hourly_rate || 0), 0) / workers.length : 0
    };

    // Calculate vendor statistics
    const vendorStats = {
      total: vendors.length,
      byCategory: vendors.reduce((acc, vendor) => {
        acc[vendor.category] = (acc[vendor.category] || 0) + 1;
        return acc;
      }, {}),
      totalRating: vendors.reduce((sum, vendor) => sum + (vendor.rating || 0), 0),
      averageRating: vendors.length > 0 ? vendors.reduce((sum, vendor) => sum + (vendor.rating || 0), 0) / vendors.length : 0,
      topRated: vendors.filter(vendor => vendor.rating >= 4).length
    };

    // Calculate financial metrics
    const financialStats = {
      budgetUtilization: projectStats.totalBudget > 0 ? (projectStats.totalSpent / projectStats.totalBudget) * 100 : 0,
      estimatedMonthlyLabor: workerStats.totalHourlyRate * 160, // 160 hours per month
      budgetRemaining: projectStats.totalBudget - projectStats.totalSpent,
      projectsOverBudget: projects.filter(project => project.spent > project.budget).length
    };

    // Generate recent activities
    const recentActivities = [
      ...projects.slice(-5).map(project => ({
        type: 'project',
        action: project.status === 'Planning' ? 'created' : 'updated',
        title: project.name,
        timestamp: project.created_at,
        description: `Project "${project.name}" ${project.status === 'Planning' ? 'created' : 'updated'} with budget $${project.budget?.toLocaleString()}`,
        status: project.status,
        priority: 'high'
      })),
      ...workers.slice(-3).map(worker => ({
        type: 'worker',
        action: 'added',
        title: worker.name,
        timestamp: worker.created_at,
        description: `New worker "${worker.name}" added as ${worker.role}`,
        status: 'completed',
        priority: 'medium'
      })),
      ...vendors.slice(-3).map(vendor => ({
        type: 'vendor',
        action: 'added',
        title: vendor.name,
        timestamp: vendor.created_at,
        description: `New vendor "${vendor.name}" added in ${vendor.category} category`,
        status: 'completed',
        priority: 'medium'
      }))
    ]
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, 8);

    // Performance metrics
    const performanceMetrics = {
      onTimeProjects: projects.filter(project => {
        if (!project.end_date) return false;
        const endDate = new Date(project.end_date);
        const today = new Date();
        return endDate >= today && project.progress_percent >= 75;
      }).length,
      delayedProjects: projects.filter(project => {
        if (!project.end_date) return false;
        const endDate = new Date(project.end_date);
        const today = new Date();
        return endDate < today && project.progress_percent < 100;
      }).length,
      highProgressProjects: projects.filter(project => project.progress_percent >= 75).length,
      lowProgressProjects: projects.filter(project => project.progress_percent <= 25).length
    };

    // Compile all analytics
    const analytics = {
      summary: {
        totalProjects: projectStats.total,
        totalWorkers: workerStats.total,
        totalVendors: vendorStats.total,
        overallBudget: projectStats.totalBudget,
        budgetUtilization: financialStats.budgetUtilization
      },
      projects: projectStats,
      workers: workerStats,
      vendors: vendorStats,
      financial: financialStats,
      performance: performanceMetrics,
      recentActivities,
      trends: {
        projectGrowth: projectStats.total > 0 ? Math.round((projectStats.total / Math.max(1, projectStats.total - 1)) * 100) : 0,
        teamGrowth: workerStats.total > 0 ? Math.round((workerStats.total / Math.max(1, workerStats.total - 1)) * 100) : 0,
        vendorGrowth: vendorStats.total > 0 ? Math.round((vendorStats.total / Math.max(1, vendorStats.total - 1)) * 100) : 0
      },
      alerts: {
        budgetAlerts: financialStats.projectsOverBudget > 0 ? `${financialStats.projectsOverBudget} projects over budget` : null,
        progressAlerts: performanceMetrics.delayedProjects > 0 ? `${performanceMetrics.delayedProjects} projects delayed` : null,
        resourceAlerts: workerStats.total === 0 ? 'No workers assigned' : null
      },
      timestamp: new Date().toISOString(),
      generatedAt: Date.now()
    };

    res.json(analytics);
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ 
      error: 'Failed to generate analytics',
      message: error.message 
    });
  }
});

// GET project-specific analytics
router.get('/projects/:id', (req, res) => {
  try {
    const { id } = req.params;
    const data = loadDB();
    
    const project = data.projects.find(p => p.id === parseInt(id));
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const projectWorkers = data.project_workers?.filter(pw => pw.project_id === parseInt(id)) || [];
    const projectExpenses = data.expenses?.filter(expense => expense.project_id === parseInt(id)) || [];

    const projectAnalytics = {
      project: {
        ...project,
        budgetRemaining: project.budget - project.spent,
        budgetUtilization: project.budget > 0 ? (project.spent / project.budget) * 100 : 0,
        daysRemaining: project.end_date ? Math.ceil((new Date(project.end_date) - new Date()) / (1000 * 60 * 60 * 24)) : null
      },
      resources: {
        totalWorkers: projectWorkers.length,
        assignedWorkers: projectWorkers.map(pw => {
          const worker = data.workers.find(w => w.id === pw.worker_id);
          return worker ? { ...worker, hours_assigned: pw.hours_per_week } : null;
        }).filter(Boolean),
        totalVendors: data.vendors?.filter(v => v.project_id === parseInt(id)).length || 0
      },
      financial: {
        totalExpenses: projectExpenses.reduce((sum, expense) => sum + (expense.amount || 0), 0),
        expenseBreakdown: projectExpenses.reduce((acc, expense) => {
          acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
          return acc;
        }, {}),
        laborCost: projectWorkers.reduce((sum, pw) => {
          const worker = data.workers.find(w => w.id === pw.worker_id);
          return sum + ((worker?.hourly_rate || 0) * (pw.hours_per_week || 0) * 4); // Monthly cost
        }, 0)
      },
      progress: {
        onTrack: project.end_date ? new Date(project.end_date) >= new Date() : true,
        efficiency: project.budget > 0 ? (project.progress_percent / (project.spent / project.budget)) * 100 : 0,
        milestone: project.progress_percent >= 75 ? 'Almost Complete' :
                  project.progress_percent >= 50 ? 'Halfway' :
                  project.progress_percent >= 25 ? 'In Progress' : 'Just Started'
      }
    };

    res.json(projectAnalytics);
  } catch (error) {
    console.error('Project analytics error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET financial analytics
router.get('/financial', (req, res) => {
  try {
    const data = loadDB();
    
    const projects = data.projects || [];
    const workers = data.workers || [];
    const expenses = data.expenses || [];

    const financialAnalytics = {
      overview: {
        totalBudget: projects.reduce((sum, project) => sum + (project.budget || 0), 0),
        totalSpent: projects.reduce((sum, project) => sum + (project.spent || 0), 0),
        totalRemaining: projects.reduce((sum, project) => sum + ((project.budget || 0) - (project.spent || 0)), 0),
        monthlyLaborCost: workers.reduce((sum, worker) => sum + ((worker.hourly_rate || 0) * 160), 0),
        totalExpenses: expenses.reduce((sum, expense) => sum + (expense.amount || 0), 0)
      },
      budgetDistribution: projects.reduce((acc, project) => {
        acc[project.status] = (acc[project.status] || 0) + (project.budget || 0);
        return acc;
      }, {}),
      expenseBreakdown: expenses.reduce((acc, expense) => {
        acc[expense.category] = (acc[expense.category] || 0) + (expense.amount || 0);
        return acc;
      }, {}),
      costEfficiency: projects.map(project => ({
        name: project.name,
        budget: project.budget,
        spent: project.spent,
        progress: project.progress_percent,
        efficiency: project.budget > 0 ? (project.progress_percent / (project.spent / project.budget)) * 100 : 0
      })),
      alerts: projects.filter(project => project.spent > project.budget).map(project => ({
        project: project.name,
        overBudget: project.spent - project.budget,
        severity: 'high'
      }))
    };

    res.json(financialAnalytics);
  } catch (error) {
    console.error('Financial analytics error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET worker productivity analytics
router.get('/workers', (req, res) => {
  try {
    const data = loadDB();
    
    const workers = data.workers || [];
    const projectWorkers = data.project_workers || [];

    const workerAnalytics = {
      summary: {
        totalWorkers: workers.length,
        totalRoles: new Set(workers.map(w => w.role)).size,
        averageRate: workers.length > 0 ? workers.reduce((sum, w) => sum + (w.hourly_rate || 0), 0) / workers.length : 0,
        totalMonthlyCost: workers.reduce((sum, worker) => sum + ((worker.hourly_rate || 0) * 160), 0)
      },
      byRole: workers.reduce((acc, worker) => {
        if (!acc[worker.role]) {
          acc[worker.role] = {
            count: 0,
            totalRate: 0,
            workers: []
          };
        }
        acc[worker.role].count++;
        acc[worker.role].totalRate += worker.hourly_rate || 0;
        acc[worker.role].workers.push({
          name: worker.name,
          rate: worker.hourly_rate,
          contact: worker.contact
        });
        return acc;
      }, {}),
      assignmentStats: workers.map(worker => {
        const assignments = projectWorkers.filter(pw => pw.worker_id === worker.id);
        return {
          name: worker.name,
          role: worker.role,
          totalProjects: assignments.length,
          totalWeeklyHours: assignments.reduce((sum, pw) => sum + (pw.hours_per_week || 0), 0),
          monthlyCost: (worker.hourly_rate || 0) * assignments.reduce((sum, pw) => sum + (pw.hours_per_week || 0), 0) * 4
        };
      }),
      utilization: {
        fullyUtilized: workers.filter(worker => {
          const assignments = projectWorkers.filter(pw => pw.worker_id === worker.id);
          return assignments.reduce((sum, pw) => sum + (pw.hours_per_week || 0), 0) >= 40;
        }).length,
        underUtilized: workers.filter(worker => {
          const assignments = projectWorkers.filter(pw => pw.worker_id === worker.id);
          return assignments.reduce((sum, pw) => sum + (pw.hours_per_week || 0), 0) < 20;
        }).length
      }
    };

    res.json(workerAnalytics);
  } catch (error) {
    console.error('Worker analytics error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
