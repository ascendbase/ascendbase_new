
import { Lightbulb, Camera, Smile, Ruler, UserSquare2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';

export function Instructions() {
  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center text-xl font-headline">
          <Ruler className="mr-2 h-6 w-6 text-primary" />
          Optimal Photo Guide for Accurate Analysis
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <p>
          For the most accurate facial ratio analysis, please follow these guidelines when taking or selecting your photo:
        </p>
        <ul className="list-disc space-y-3 pl-5">
          <li className="flex items-start">
            <Camera className="mr-3 mt-1 h-5 w-5 flex-shrink-0 text-accent" />
            <div>
              <strong>Frontal Photo:</strong> For "Frontal Analysis," ensure the camera is at eye level and directly in front of your face. Avoid tilting your head up, down, or sideways. The face should occupy most of the frame.
            </div>
          </li>
           <li className="flex items-start">
            <UserSquare2 className="mr-3 mt-1 h-5 w-5 flex-shrink-0 text-accent" />
            <div>
              <strong>Profile Photo:</strong> For "Profile Analysis," use a side-profile photo. Stand so the camera sees one side of your face. Keep your head level and look straight ahead.
            </div>
          </li>
          <li className="flex items-start">
            <Lightbulb className="mr-3 mt-1 h-5 w-5 flex-shrink-0 text-accent" />
            <div>
              <strong>Lighting:</strong> Use even, soft lighting. Avoid harsh shadows or overly bright spots. Natural daylight facing a window (but not in direct sunlight) is often best.
            </div>
          </li>
          <li className="flex items-start">
            <Smile className="mr-3 mt-1 h-5 w-5 flex-shrink-0 text-accent" />
            <div>
              <strong>Facial Expression:</strong> Maintain a neutral facial expression. Do not smile, frown, or make other exaggerated expressions. Lips should be gently closed or slightly parted in a relaxed manner.
            </div>
          </li>
          <li className="flex items-start">
            <Ruler className="mr-3 mt-1 h-5 w-5 flex-shrink-0 text-accent" />
            <div>
              <strong>Obstructions &amp; Clarity:</strong> Ensure your entire face is visible, from hairline to chin, and ear to ear (if possible, though frontal view is primary). Hair should be pulled back from the face. Avoid wearing glasses. The image should be clear and in focus.
            </div>
          </li>
        </ul>
        <p className="font-medium text-primary">
          Following these steps will significantly improve the accuracy of landmark detection and the resulting facial ratio measurements.
        </p>
      </CardContent>
    </Card>
  );
}
