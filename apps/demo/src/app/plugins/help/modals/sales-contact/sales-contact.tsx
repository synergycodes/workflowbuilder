import { LinkedinLogo, PaperPlaneRight } from '@phosphor-icons/react';
import { Avatar, Button } from '@synergycodes/overflow-ui';
import clsx from 'clsx';

import styles from './sales-contact.module.css';

import imageUrl from '../../assets/maciej-teska-workflow.jpg';

const salesDetails = {
  name: 'Maciej Teska',
  imageUrl,
  position: 'CEO',
  email: 'maciej.teska@workflowbuilder.io',
  linkedInUrl: 'https://linkedin.com/in/maciej-teska',
};

export function SalesContact() {
  const { name, position, imageUrl, email, linkedInUrl } = salesDetails;
  function handleLinkedInClick() {
    window.open(`${linkedInUrl}`, '_blank');
  }

  function handleEmailClick() {
    globalThis.location.href = `mailto:${email}`;
  }

  return (
    <div className={styles['container']}>
      <div className={styles['details-container']}>
        <Avatar username={name} imageUrl={imageUrl} />
        <div className={styles['details']}>
          <span className="ax-public-h10">{name}</span>
          <span className={clsx('ax-public-p11', styles['position'])}>{position}</span>
        </div>
      </div>
      <div className={styles['buttons']}>
        <Button size="medium" variant="secondary" onClick={handleLinkedInClick}>
          <LinkedinLogo />
          LinkedIn
        </Button>
        <Button size="medium" variant="secondary" onClick={handleEmailClick}>
          <PaperPlaneRight />
          Email
        </Button>
      </div>
    </div>
  );
}
