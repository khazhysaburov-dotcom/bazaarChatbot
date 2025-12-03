import React from 'react';
import type { Car } from '../types';
import { Tag, Gauge, Calendar, DollarSign } from 'lucide-react';

interface CarCardProps {
  car: Car;
}

const CarCard: React.FC<CarCardProps> = ({ car }) => {
  return (
    <div className="group relative bg-nebula-800 rounded-2xl overflow-hidden border border-nebula-700 shadow-lg hover:shadow-nebula-500/20 transition-all duration-300 hover:-translate-y-1">
      {/* Image Container */}
      <div className="relative h-48 w-full overflow-hidden">
        <img 
          src={car.imageUrl} 
          alt={`${car.make} ${car.model}`} 
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
        />
        <div className="absolute top-3 right-3 bg-nebula-900/80 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold text-nebula-400 border border-nebula-500/30">
          {car.type}
        </div>
      </div>

      {/* Content */}
      <div className="p-5">
        <div className="flex justify-between items-start mb-2">
          <div>
            <h3 className="text-xl font-bold text-white">{car.make}</h3>
            <p className="text-nebula-400 font-medium">{car.model}</p>
          </div>
          <div className="flex items-center text-green-400 font-bold bg-green-400/10 px-2 py-1 rounded-lg">
            <DollarSign size={16} />
            {car.price.toLocaleString()}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 my-4 text-sm text-gray-400">
          <div className="flex items-center gap-2">
            <Calendar size={14} className="text-nebula-500" />
            <span>{car.year}</span>
          </div>
          <div className="flex items-center gap-2">
            <Gauge size={14} className="text-nebula-500" />
            <span>{car.mileage.toLocaleString()} km</span>
          </div>
        </div>

        <p className="text-gray-400 text-sm line-clamp-2 mb-4 h-10">
          {car.description}
        </p>

        <div className="flex flex-wrap gap-2 mb-4">
          {car.features.slice(0, 3).map((feature, idx) => (
            <span key={idx} className="text-xs bg-nebula-700/50 text-gray-300 px-2 py-1 rounded-md border border-nebula-600/30">
              {feature}
            </span>
          ))}
        </div>

        <button className="w-full bg-nebula-500 hover:bg-nebula-400 text-white font-semibold py-2 rounded-xl transition-colors flex items-center justify-center gap-2 group-active:scale-95">
          <Tag size={16} />
          View Details
        </button>
      </div>
    </div>
  );
};

export default CarCard;