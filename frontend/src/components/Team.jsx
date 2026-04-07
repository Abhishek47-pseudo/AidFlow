import React from 'react';
import TeamMember from './TeamMember';

const Team = () => {
  const teamMembers = [
    { name: 'Aaditya Arya', photoUrl: 'imgs/Aaditya.jpg', role: '2310993752' },
    { name: 'Abhishek Kumar', photoUrl: 'imgs/Abhishek.jpg', role: '2310993765' },
    { name: 'Parth Mehta', photoUrl: 'imgs/Parth.jpg', role: '2310993899' },
  ];

  return (
    <section id="team" className="team-section hidden-section">
      <div className="container">
        <h2 className="section-title text-center">Meet the Team</h2>
        <div className="team-grid">
          {teamMembers.map((member, index) => (
            <TeamMember
              key={index}
              name={member.name}
              photoUrl={member.photoUrl}
              role={member.role}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default Team;