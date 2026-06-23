
import React from 'react';
import { ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { Project } from '@/types/payload-types';

interface ProjectsShowcaseProps {
  projects: Project[];
}

const ProjectsShowcase: React.FC<ProjectsShowcaseProps> = ({ projects }) => {
  return (
    <section className="section bg-white">
      <div className="container-custom">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12">
          <div>
            <h2 className="section-title text-left">Our Recent Projects</h2>
            <p className="section-subtitle text-left max-w-xl">
              Explore our portfolio of successfully completed solar installations across Sri Lanka.
            </p>
          </div>
          <a
            href="/projects"
            className="btn-secondary mt-4 md:mt-0 group"
          >
            View All Projects
            <ArrowRight className="ml-2 transition group-hover:translate-x-1" size={18} />
          </a>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {projects.slice(0, 3).map((project, index) => (
            <motion.div
              key={project.$id}
              className="bg-white rounded-lg overflow-hidden shadow-lg"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <div className="h-48 overflow-hidden">
                {project.image_url ? (
                  <img
                    src={project.image_url}
                    alt={project.title}
                    className="w-full h-full object-cover transition-transform hover:scale-105 duration-500"
                    onError={(e) => {
                      console.error('Failed to load project image:', project.image_url);
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                    <span className="text-gray-400">No Image</span>
                  </div>
                )}
              </div>
              <div className="p-6">
                <div className="text-sm text-primary font-medium mb-2">{project.category}</div>
                <h3 className="text-xl font-bold mb-2">{project.title}</h3>
                <p className="text-brand-gray mb-4 line-clamp-2">{project.description}</p>
                <a
                  href={`/projects/${project.$id}`}
                  className="text-primary font-medium hover:underline flex items-center"
                >
                  View Details
                  <ArrowRight size={16} className="ml-1" />
                </a>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ProjectsShowcase;
